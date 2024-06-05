<?php

header('Content-type: text/csv');
header("Cache-control: private");

foreach ($_GET as $k => $v)     {

	if(preg_match('/[^0-9a-z_-]/', $k) ||
		preg_match('/[^,0-9A-Za-z \/=-]/', $v))

		die("Oops: $k, $v");

}

$db = pg_connect("port=6432 dbname=global user=readonly password=masha27uk", PGSQL_CONNECT_FORCE_NEW)
	or die("could not connect to DB");

if( substr( $_GET['f'], 0, 3) == 'get' )
	$_GET['f']();

/////////
//  usage: GET api/gettsv.php?f=func&par=parameters
/////////

function getcatalog()	{

	global $db;

	static $select = array(
		"country" => "countryid,country,name from stattotals0 join countries using(countryid)",
		"lang" => "langid,lang,name from stattotals0 join languages using(langid)",
		"genre" => "genreid,genre,genre from genres join gamegenres using(genreid) join stattotals0 using(titleid)",
		"game" => "titleid,name,'' from games join stattotals0 using(titleid)"
	);

	$sel = $select[$_GET['cat']];

	echo implode(pg_copy_to($db, "(

		select distinct $sel

	)", chr(9)));

}

function getdata()	{

	global $db;

	$select = '';
	$where = 'true';
	$join = '';
	$union = '';

	if(isset($_GET['country']))
		if(strlen($_GET['country']) > 0)
			$where .= " and countryid=any(array[" . $_GET['country'] . "])";
		else
			$where .= " and countryid is null";
	else
		$select = "countryid";


	if(isset($_GET['lang']))
		if(strlen($_GET['lang']) > 0)
			$where .= " and langid=any(array[" . $_GET['lang'] . "])";
		else
			$where .= " and langid is null";
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
			select null::smallint,sum(players)
			from stattotals0
			$join
			where $where
			group by 1
		";

	if( isset($_GET['game']) && isset($_GET['genre']) && strlen($_GET['genre']) == 0 && strlen($_GET['game']) == 0 )
		$where .= " and titleid is null";

	$req = "
		select $select,sum(players)
		from stattotals0
		$join
		where $where
		group by 1
		$union
	";

#	error_log($req);

	echo implode(pg_copy_to($db, "(

		$req

	)", chr(9)));

}


function gettimegraph()	{

	global $db;

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

	echo implode(pg_copy_to($db, "(
		select
			*
		from res
		where $subj=any(
			select $subj from (
				select $subj, sum(players)
				from res
				group by 1
				order by 2 desc
				limit 3
			) as limiter
		)
		order by utime

	)", chr(9)));

	pg_query($db, "rollback");

	pg_close($db);

}


function gettimeref()	{

	global $db;

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

	if($subj == 'countryid')
		if(strlen($_GET['country']) > 0)
			$where .= "countryid=any(array[" . $_GET['country'] . "])";
		else
			$where .= "countryid is not null";
	else
		$where .= "countryid is null";

	if($subj == 'langid')
		if(strlen($_GET['lang']) > 0)
			$where .= " and langid=any(array[" . $_GET['lang'] . "])";
		else
			$where .= " and langid is not null";
	else
		$where .= " and langid is null";

	if($subj == 'genreid' || $subj == 'titleid') {
		if(strlen($_GET['game']) > 0)
			$where .= " and titleid=any(array[" . $_GET['game']. "])";

		if(strlen($_GET['genre']) > 0)
			$where .= " and titleid=any(select titleid from gamegenres where genreid=any(array[" . $_GET['genre'] . "]))";

		$where .= " and titleid is not null";

	} else
		$where .= " and titleid is null";

	# condition is ready
	# now limiter
	$limiter = "
		select $subj from (
			select $subj,sum(players)
			from stattotals0
			$join
			where $where
			group by 1
			order by 2 desc
			limit 3
		) as limiter
	";

	$req = "
		select 
			utime,
			$subj,
			sum(players)
		from stattab
		$join
		where 
			titleid is not null
			and countryid is not null
			and langid is not null
			and $subj=any($limiter)
			and type=0
		group by 1,2
		order by 1
	";

	error_log($req);

	echo implode(pg_copy_to($db, "(

		$req

	)", chr(9)));

}

