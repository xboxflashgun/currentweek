var filters = [
	{
		name: "country",		// request + divname
		sels: [],			// selection list
		tab: [],			// data
	},
	{
		name: "lang",
		sels: [],
	},
	{
		name: "genre",
		sels: [],
	},
	{
		name: "game",
		sels: [],
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
