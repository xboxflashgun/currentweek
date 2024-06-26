<?php

header('Content-type: text/csv');
header("Cache-control: private");

foreach ($_GET as $k => $v)     {

	if(preg_match('/[^0-9a-z_-]/', $k) ||
		preg_match('/[^,0-9A-Za-z \/=-]/', $v))

		die("Oops: $k, $v");

}

$mc = new Memcached('xboxstat2');
if (!count($mc->getServerList()))
	$mc->addServer( '127.0.0.1', 11211 );

$rep = $mc->get($_SERVER['QUERY_STRING']);

if( $rep )      {
	echo $rep;
	return 0;
}

$db = pg_connect("port=6432 dbname=global user=readonly password=masha27uk", PGSQL_CONNECT_FORCE_NEW)
	or die("could not connect to DB");

$rep = "";

if( substr( $_GET['f'], 0, 3) == 'get' )
	$_GET['f']();

$to = 300;

$mc->set($_SERVER['QUERY_STRING'], $rep, $to);

header("Cache-control: max-age=$to");
echo $rep;


/////////
//  usage: GET api/gettsv.php?f=func&par=parameters
/////////

function getcatalog()	{

	global $db, $rep;

	static $select = array(
		"country" => "countryid,country,name from stattotals1 join countries using(countryid)",
		"lang" => "langid,lang,name from stattotals1 join languages using(langid)",
		"genre" => "genreid,genre,genre from genres join gamegenres using(genreid) join stattotals1 using(titleid)",
		"game" => "titleid,name,'' from games join stattotals1 using(titleid)"
	);

	$sel = $select[$_GET['cat']];

	$rep = implode(pg_copy_to($db, "(

		select distinct $sel

	)", chr(9)));

}

function getdata()	{

	global $db, $rep;

	$select = '';
	$where = 'true';
	$join = '';
	$union = '';

	if(isset($_GET['country']))
		if(strlen($_GET['country']) > 0)
			$where .= " and countryid=any(array[" . $_GET['country'] . "])";
		else
			$where .= " and countryid=0";
	else
		$select = "countryid";


	if(isset($_GET['lang']))
		if(strlen($_GET['lang']) > 0)
			$where .= " and langid=any(array[" . $_GET['lang'] . "])";
		else
			$where .= " and langid=0";
	else
		$select = "langid";

	if(isset($_GET['game']))
		if(strlen($_GET['game']) > 0)
			$where .= " and titleid=any(array[" . $_GET['game']. "])";
		else
			;
	else
		$select = "titleid";

	if(isset($_GET['genre']))
		if(strlen($_GET['genre']) > 0)
			$where .= " and titleid=any(select titleid from gamegenres where genreid=any(array[" . $_GET['genre'] . "]))";
		else
			;
	else	{
		$select = "genreid";
		$join = "join gamegenres using(titleid)";
	}

	if(!isset($_GET['game']) || !isset($_GET['genre']))
		$union = "
			union
			select 0,sum(players)
			from stattotals1
			$join
			where $where
			group by 1
		";

	if( isset($_GET['game']) && isset($_GET['genre']) && strlen($_GET['genre']) == 0 && strlen($_GET['game']) == 0 )
		$where .= " and titleid=0";

	$req = "
		select $select,sum(players)
		from stattotals1
		$join
		where $where
		group by 1
		$union
	";

	# error_log($req);

	$rep = implode(pg_copy_to($db, "(

		$req

	)", chr(9)));

}


function gettimegraph()	{

	global $db, $rep;

	$where = "";		# filter condition

	static $sels = array(
		"info" => "0",
		"country" => "countryid",
		"lang" => "langid",
		"genre" => "genreid",
		"game" => "titleid",
	);

	$subj = $sels[$_GET['subj']];
	$join = ($subj == 'genreid') ? 'join gamegenres using(titleid)' : '';

	if(strlen($_GET['country']) > 0)
		$where .= "countryid=any(array[" . $_GET['country'] . "])";
	else
		$where .= "countryid is not null";

	if(strlen($_GET['lang']) > 0)
		$where .= " and langid=any(array[" . $_GET['lang'] . "])";
	else
		$where .= " and langid is not null";

	if(strlen($_GET['game']) > 0)
		$where .= " and titleid=any(array[" . $_GET['game']. "])";

	if(strlen($_GET['genre']) > 0)
		$where .= " and titleid=any(select titleid from gamegenres where genreid=any(array[" . $_GET['genre'] . "]))";

	if(strlen($_GET['game']) == 0 && strlen($_GET['genre']) == 0)
		$where .= " and titleid is not null";

	pg_query($db, "begin");

	pg_query($db, "
		create temp table res as
		select
			utime,
			$subj,
			sum(players) as players
		from stattab
		$join
		where $where
		and type=0
		group by 1,2
	");

	$rep = implode(pg_copy_to($db, "(
		select
			*
		from res
		where $subj=any(
			select $subj from (
				select $subj, sum(players)
				from res
				group by 1
				order by 2 desc
				limit 10
			) as limiter
		)
		order by utime

	)", chr(9)));

	pg_query($db, "rollback");

	pg_close($db);

}

# for subj = country and lang only
function gettimeref()	{

	global $db, $rep;

	$where = "";		# filter condition

	static $sels = array(
		"country" => "countryid",
		"lang" => "langid",
		"genre" => "genreid",
	);

	$subj = $sels[$_GET['subj']];
	$join = ($subj == 'genreid') ? 'join gamegenres using(titleid)' : '';

	if(strlen($_GET['country']) > 0)
		$where .= "countryid=any(array[" . $_GET['country'] . "])";
	else
		$where .= "countryid is not null";

	if(strlen($_GET['lang']) > 0)
		$where .= " and langid=any(array[" . $_GET['lang'] . "])";
	else
		$where .= " and langid is not null";

	$list = "$subj=any(array[" . $_GET['list'] . "])";

	$req = "
		select * from (
			select
				utime,
				$subj,
				sum(players) as players
			from stattab
			$join
			where $where
			and type=0
			group by 1,2
		) as tab
		where $list
	";

	# error_log($req);
	
	$rep = implode(pg_copy_to($db, "(
		$req
	)", chr(9)));

	pg_close($db);

}

