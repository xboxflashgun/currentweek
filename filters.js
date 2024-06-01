// 

var filters = [
	{
		name: "country",		// request + divname
		sels: new Set(),			// selection list
		tab: [],			// data: { id: ..., name: ..., players: ..., title: ..., val: ...
		idname: {},			// idname[id] = name
		drawer: barchart,
	},
	{
		name: "lang",
		sels: new Set(),
		tab: [],
		idname: {},
		drawer: barchart,
	},
	{
		name: "genre",
		sels: new Set(),
		tab: [],
		idname: {},
		drawer: horizbar,
	},
	{
		name: "game",
		sels: new Set(),
		tab: [],
		idname: {}, 
	}
];

var percflag;		// true if percentage scale

// set value: absolute/percentage
function setvals(f)	{

	if(f.ref)	{

		percflag = d3.select('#infodiv input[value="perc"]').property("checked");

		f.tab.forEach( t => t.val = (percflag) ? 1. * t.players/f.ref : t.players );

	}

}

// horizontal bar chart for genres
function horizbar(f)	{

	console.log(f);

}

// barchart for country and language
function barchart(f)	{

	var div = d3.select(`#${f.name}div .svg`);

	var margin = { top: 20, right: 30, bottom: 40, left: 60 },
		width = f.tab.length * 20 + 90 - margin.left - margin.right,
		height = div.node().clientHeight - margin.top - margin.bottom;

	if( ! f.svg )	{

		f.svg = div.append("svg")
			.attr("height", height + margin.top + margin.bottom)
		    .append("g")
				.attr("transform", `translate(${margin.left},${margin.top})`);
		f.x = d3.scaleBand();
		f.xaxis = f.svg.append("g");

		f.y = d3.scaleLinear();
		f.yaxis = f.svg.append("g");
		f.y.range( [ height, 0 ] );

	}

	d3.select(f.svg.node().parentNode)
		.attr("width", width + margin.left + margin.right);

	// X axis
	f.x.range([ 0, width ])
		.padding(0.2);
	f.xaxis
		.attr("transform", `translate(0,${height})`);

	// update x axis
	f.x.domain(f.tab.sort( (a,b) => b.val - a.val ).map( d => d.name ));
	// f.xaxis.tickFormat(d3.format( percflag ? "%" : ""));
	f.xaxis
		.transition()
		.duration(700)
		.call(d3.axisBottom(f.x));

	// update y axis
	f.y.domain([ 0, d3.max(f.tab, d => d.val) ]);
	f.yaxis
		.transition()
		.duration(700)
		.call(d3.axisLeft(f.y).tickFormat(d3.format( percflag ? ".0%" : ".0s")));
	
	// bars
	var u = f.svg.selectAll("rect")
		.data(f.tab);

	u.join(enter => {
		enter.append("rect")
			.transition()
			.attr("x", d => f.x(d.name))
			.attr("y", d => f.y(d.val))
			.attr("width", f.x.bandwidth())
			.attr("height", d => height - f.y(d.val))
			.attr("fill", d => f.sels.has(d.id) ? 'red' : 'green')
			.attr("data-id", d => d.id)
			.delay( (d,i) => i*30 );
		enter.append("title").text(d => d.title + '\n' + d.players);
	}, update => {
		update
			.transition()
			.duration(700)
			.attr("x", d => f.x(d.name))
			.attr("y", d => f.y(d.val))
			.attr("width", f.x.bandwidth())
			.attr("height", d => height - f.y(d.val))
			.attr("fill", d => f.sels.has(d.id) ? 'red' : 'green')
			.attr("data-id", d => d.id);
		update.select("title").text( d => d.title + '\n' + d.players);
	}, exit => {
		exit
			.transition()
			.duration(700)
			.remove();
	});

	function select(id)	{

		if(f.sels.has(id))
			f.sels.delete(id);
		else
			f.sels.add(id);

		readalldata();

	}


	f.svg.selectAll("text").on("click", (e) => {
		var name = d3.select(e.target).text();
		var id = Object.keys(f.idname).filter( d => f.idname[d][0] === name )[0];
		select(id);
		d3.select(e.target).attr("color", f.sels.has(id) ? '#fff' : null);
	});

	f.svg.selectAll("rect").on("click", (e) => {
		var id = e.target.dataset.id;
		select(id);
		d3.select(e.target).attr("fill", f.sels.has(id) ? 'red' : 'green');
	});

	// mark xaxis text
	f.xaxis.selectAll("text").attr("color", null);
	f.xaxis.selectAll("text")
		.filter( d => f.sels.has(
			Object.keys(f.idname).filter(e => f.idname[e][0] === d)[0] ))
		.attr("color", "#fff");

}

function readalldata()	{

	var pr = [];

	filters.forEach( f => {
		
		var prom = [];
		if(Object.keys(f.idname).length === 0)
			prom.push(readidnames(f));

		prom.push(readdata(f));

		pr.push(Promise.all( prom )
		.then( () => {

			f.tab.forEach( t => {

				t.name = f.idname[t.id][0];
				t.title = f.idname[t.id][1];

			});

			setvals(f);

			if(f.drawer)
				f.drawer(f);

		}));

	});

	Promise.all( pr )
	.then( () => {

		console.log('ready to draw graph');

		d3.selectAll("#infodiv input").on("change", () => filters.forEach( f => {

			setvals(f);

			if(f.drawer)
				f.drawer(f);

		}));
		
		listfilters();


	});

}

function listfilters()	{

	var span = d3.select("#filterdiv span");
	span.selectAll("*").remove();

	filters.forEach( f => {

		var sp = span.append("span");

		Array.from(f.sels).forEach( id => {

			sp.append("span")
				.attr("title", f.idname[id][1]).text( f.idname[id][0] )
				.attr("data-id", id);

		});
	
		sp.selectAll("span").on("click", e => {

			var id = e.target.dataset.id;
			f.sels.delete(id);
			readalldata();

		});

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

		f.tab = [];
		f.ref = 0;

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

		req += `&${f.name}=${Array.from(f.sels).join(',')}`;

	});

	return req;

}
