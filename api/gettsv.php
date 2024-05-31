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

function _getgamenames()	{

	global $db;

	echo implode(pg_copy_to($db, "(
		
		select titleid,name from hourlytotals

	)", chr(9)));

}

function getcatalog()	{

	global $db;

	$select = array(
		"country" => "countryid,country,name from hourlytab join countries using(countryid)",
		"lang" => "langid,lang,name from hourlytab join languages using(langid)",
		"genre" => "genreid,genre,genre from genres join gamegenres using(genreid) join hourlytab using(titleid)",
		"game" => "titleid,name,'' from games join hourlytab using(titleid)"
	);

	$sel = $select[$_GET['cat']];

	echo implode(pg_copy_to($db, "(

		select distinct $sel

	)", chr(9)));

}

function getdata()	{

	global $db;

	$select = '';
	$where = 'utime is null';
	$group = '';
	$join = '';

	if(isset($_GET['country']))
		if(strlen($_GET['country']) > 0)
			$where .= " and countryid=any(array[" . $_GET['country'] . "])";
		else
			$where .= " and countryid is null";
	else
		$select = "countryid,players";


	if(isset($_GET['lang']))
		if(strlen($_GET['lang']) > 0)
			$where .= " and langid=any(array[" . $_GET['lang'] . "])";
		else
			$where .= " and langid is null";
	else
		$select = "langid,players";

	if(isset($_GET['game']))
		if(strlen($_GET['game']) > 0)
			$where .= " and titleid=any(array[" . $_GET['game']. "])";
		else
			;
	else
		$select = "titleid,players";

	if(isset($_GET['genre']))
		if(strlen($_GET['genre']) > 0)
			$where .= " and titleid=any(select titleid from gamegenres where genreid=any(array[" . $_GET['genre'] . "]))";
		else
			;
	else	{
		$select = "genreid,sum(players)";
		$join = "join gamegenres using(titleid)";
		$group = "group by genreid";
	}

	if( isset($_GET['game']) && isset($_GET['genre']) && strlen($_GET['genre']) == 0 && strlen($_GET['game']) == 0 )
		$where .= " and titleid is null";

	echo implode(pg_copy_to($db, "(

		select $select
		from hourlytab
		$join
		where $where
		$group
		limit 300

	)", chr(9)));

}


