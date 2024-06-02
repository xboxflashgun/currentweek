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

	$where = 'utime is not null';

	$subj = $_GET['subj'];		# f.name (info/country/lang/...)

	$join = ($subj == 'genre') ? 'join gamegenres using(titleid)' : '';

	static $sels = array(
		"info" => "null::int",
		"country" => "countryid",
		"lang" => "langid",
		"genre" => "genreid",
		"game" => "titleid",
	);

	$select = $sels[$subj];

	if(strlen($_GET['country']) > 0)
		$where .= " and countryid=any(array[" . $_GET['country'] . "])";
	else
		$where .= " and countryid is not null";

	if(strlen($_GET['lang']) > 0)
		$where .= " and langid=any(array[" . $_GET['lang'] . "])";
	else
		$where .= " and langid is not null";

	if(strlen($_GET['game']) > 0)
		$where .= " and titleid=any(array[" . $_GET['game']. "])";

	if(strlen($_GET['genre']) > 0)
		$where .= " and titleid=any(select titleid from gamegenres where genreid=any(array[" . $_GET['genre'] . "]))";

	if(strlen($_GET['genre']) == 0 && strlen($_GET['game']) == 0 )
		$where .= " and titleid is not null";

	if($subj != "info")
		$subreq = " and $select=any(" . subreqtimegraph($subj, $select) . ")";
	else
		$subreq = "";

	$req = "
		select utime,$select,sum(players)
		from hourlytab
		$join
		where $where $subreq
		group by 1,cube(2)
		order by 1
	";

#	error_log($req);

	echo implode(pg_copy_to($db, "(

		$req

	)", chr(9)));
	
#	echo $req;

}

// sel = countryid/langid/titleid
function subreqtimegraph($subj, $sel)	{

	$where = "";
	$join = "";

	if($subj == 'country')
		$where .= "countryid is not null";
	else
		$where .= "countryid is null";

	if($subj == 'lang')
		$where .= " and langid is not null";
	else
		$where .= " and langid is null";

	if($subj == 'genre')	{
		$where .= " and titleid is not null";
		$join = "join gamegenres using(titleid)";
	}

	if($subj == 'game')
		$where .= " and titleid is not null";

	return "
		select $sel from (
			select 
				$sel, sum(players)
			from weeklytotals
			$join
			where $where
			group by 1
			order by 2 desc
		) as limiter
		limit 3
	";

}






