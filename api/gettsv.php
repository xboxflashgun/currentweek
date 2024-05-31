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

function getgamenames()	{

	global $db;

	echo implode(pg_copy_to($db, "(
		
		select titleid,name from hourlytotals

	)", chr(9)));

}

function getdata()	{

	global $db;

	$select = '';
	$where = 'utime is null';
	$group = '';
	$join = '';

	if(isset($_GET['country']))
		$where .= " and countryid=any(array[" . $_GET['country'] . "])";
	else
		$select = "countryid,players";


	if(isset($_GET['lang']))
		$where .= " and langid=any(array[" . $_GET['lang'] . "])";
	else
		$select = "langid,players";

	if(isset($_GET['game']))
		$where .= " and titleid=any(array[" . $_GET['game']. "])";
	else
		$select = "titleid,players";

	if(isset($_GET['genre']))
		$where .= " and titleid=any(select titleid from gamegenres where genreid=any(array[" . $_GET['genre'] . "]))";
	else	{
		$select = "genreid,sum(players)";
		$join = "join gamegenres using(titleid)";
		$group = "group by genreid";
	}

	echo implode(pg_copy_to($db, "(

		select $select
		from hourlytab
		$join
		where $where
		$group

	)", chr(9)));

}


