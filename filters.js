var filters = [
	{
		name: "country",		// request + divname
		sels: [1,2,3],			// selection list
		tab: [],			// data
	},
	{
		name: "lang",
		sels: [4,5,6],
	},
	{
		name: "genre",
		sels: [7,8,9],
	},
	{
		name: "game",
		sels: [10,11,12],
	}
];


function readalldata()	{

	filters.forEach( f => readdata(f) );

}

function readdata(f)	{

	var req = makereqstr(f);

	fetch("api/gettsv.php?f=getdata" + req)
	.then( res => res.text() )
	.then( res => {

		console.log(f.name, req, res);

	});

}

function makereqstr(filt)	{

	var req = '';
	filters.forEach( f => {

		if(f === filt)
			return;		// skip same graph

		req += `&${f.name}=${f.sels.join(',')}`;

	});

	return req;

}
