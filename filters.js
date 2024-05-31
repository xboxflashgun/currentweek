// 

var filters = [
	{
		name: "country",		// request + divname
		sels: [],			// selection list
		tab: [],			// data
		idname: {},			// idname[id] = name
		drawer: barchart,
	},
	{
		name: "lang",
		sels: [],
		tab: [],
		idname: {},
		drawer: barchart,
	},
	{
		name: "genre",
		sels: [],
		tab: [],
		idname: {},
	},
	{
		name: "game",
		sels: [],
		tab: [],
		idname: {}, 
	}
];


// barchart for country and language
function barchart(f)	{

	var div = d3.select(`#${f.name}div .svg`);

	const margin = { top: 30, right: 30, bottom: 70, left: 60 },
		width = f.tab.length*6 - margin.left - margin.right,
		height = div.node().clientHeight - margin.top - margin.bottom;

	var svg = div.append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
			.attr("transform", `translate(${margin.left},${margin.top})`);

	// X axis
	f.x = d3.scaleBand()
		.range([ 0, width ])
		.domain(f.tab.map( d => d.name ))
		.padding(0.2);
	svg.append("g")
		.attr("transform", `translate(0,${height})`)
		.call(d3.axisBottom(f.x));

}

function readalldata()	{

	var pr = [];

	filters.forEach( f => {
		
		var pr1 = readidnames(f);
		var pr2 = readdata(f);

		pr.push(Promise.all( [ pr1, pr2 ] )
		.then( () => {

			f.tab.forEach( t => {

				t.name = f.idname[t.id][0];
				t.title = f.idname[t.id][1];

			});

			console.log(f);

			if(f.drawer)
				f.drawer(f);

		}));

	});

	Promise.all( pr )
	.then( () => {

		console.log('ready to draw graph');

	});

}

function readidnames(f)	{

	return fetch("api/gettsv.php?f=getcatalog&cat=" + f.name)
		.then( res => res.text() )
		.then( res => {

			res.split('\n').forEach(s => {

				if(s.length === 0)
					return;

				var [id, name, title] = s.split('\t');
				f.idname[id] = [ name, title ];

			});

	});

}

function readdata(f)	{

	var req = makereqstr(f);

	return fetch("api/gettsv.php?f=getdata" + req)
	.then( res => res.text() )
	.then( res => {

		res.split('\n').forEach( s => {

			if(s.length === 0)
				return;

			var [id, players] = s.split('\t');
			players = +players;

			if(id === '\\N')
				f.ref = players;
			else
				f.tab.push( {id: id, players: players} );

		});

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
