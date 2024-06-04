<?php

header('Content-type: text/csv');
header("Cache-control: private");

foreach ($_GET as $k => $v)     {

	if(preg_match('/[^0-9a-z_-]/', $k) ||
		preg_match('/[^,0-9A-Za-z \/=-]/', $v))

		die("Oops: $k, $v");

}

$db = pg_pconnect("port=6432 dbname=global user=readonly password=masha27uk")
	or die("could not connect to DB");

if( substr( $_GET['f'], 0, 3) == 'get' )
	$_GET['f']();

/////////
//  usage: GET api/gettsv.php?f=func&par=parameters
/////////

function getcatalog()	{

	global $db;

	static $select = array(
		"country" => "countryid,country,name from weeklytotals join countries using(countryid)",
		"lang" => "langid,lang,name from weeklytotals join languages using(langid)",
		"genre" => "genreid,genre,genre from genres join gamegenres using(genreid) join weeklytotals using(titleid)",
		"game" => "titleid,name,'' from games join weeklytotals using(titleid)"
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
			from weeklytotals
			$join
			where $where
			group by 1
		";

	if( isset($_GET['game']) && isset($_GET['genre']) && strlen($_GET['genre']) == 0 && strlen($_GET['game']) == 0 )
		$where .= " and titleid is null";

	$req = "
		select $select,sum(players)
		from weeklytotals
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
			from weeklytotals
			$join
			where $where
			group by 1
			order by 2 desc
			limit 10
		) as limiter
	";

	$req = "
		select 
			utime,
			$subj,
			sum(players),
			sum(players) filter (where $where)
		from hourlytab
		$join
		where utime is not null and $subj=any($limiter)
		group by 1,2
		order by 1
	";

	error_log($req);

	echo implode(pg_copy_to($db, "(

		$req

	)", chr(9)));

}

