var filters = [
	{
		name: "info",
	},
	{
		name: "country",		// request + divname
		sels: new Set(),			// selection list
		tab: [],			// data: { id: ..., name: ..., players: ..., title: ..., val: ...
		idname: {},			// idname[id] = name
		drawer: barchart,
		stater: horstat,
	},
	{
		name: "lang",
		sels: new Set(),
		tab: [],
		idname: {},
		drawer: barchart,
		stater: horstat,
	},
	{
		name: "genre",
		sels: new Set(),
		tab: [],
		idname: {},
		drawer: horizbar,
		stater: horstat,
	},
	{
		name: "game",
		sels: new Set(),
		tab: [],
		idname: {}, 
		drawer: gametab,
		stater: horstat,
	},
	{
		name: "graph",
		drawer: drawgraph,
		stater: graphstat,
	}
];

var percflag = true;		// true if percentage scale

function horstat(f)	{
	
	d3.select(`#${f.name}stat`).text(f.tab.length);
	if(f.name === 'country')
		d3.select("#gamersstat").text(f.ref);

}

// set value: absolute/percentage
function setvals(f)	{

	if(f.ref)
		f.tab.forEach( t => t.val = (percflag) ? 1. * t.players/f.ref : t.players );
	
	if(f.name === 'graph')
		Object.keys(data).forEach( id => {
			data[id].forEach( d =>
				d.val = (percflag) ? 1. * d.players/d.ref : d.players
			)
		});

}

function gametab(f)	{

	if( ! f.div )	{
		f.div = d3.select("#gametab");
		f.div.append("table");
	}

	var tab = f.div.select("table");
	var str = d3.select(`#namefilter`).property("value").toLowerCase();
	var fff;	// filter function

	if(str.length > 0)
		fff = a => a.toLowerCase().indexOf(str) >= 0;
	else
		fff = a => true;

	var playmax = d3.max(f.tab, d => d.players);

	tab.selectAll("tr")
	.data(f.tab
		.filter(d => fff(d.name))
		.sort( (a,b) => b.val - a.val))
	.join( enter => {
		var row = enter.append("tr");
		row.attr("data-id", d => d.id);
		row.append("td").text( d => d.name);
		row.append("td").text( d => d3.format( percflag ? ".3%" : ".3~s" )(d.val));
		row.style("background", d => `linear-gradient(to right, #050 ${100.*d.players/playmax}%, rgba(0,0,0,0) ${100.*d.players/playmax}% )`);
	}, update => {
		update.attr("data-id", d => d.id);
		update.select("td:nth-child(1)").text(d => d.name);
		update.select("td:nth-child(2)").text( d => d3.format( percflag ? ".3%" : ".3~s" )(d.val));
		update.style("background", d => `linear-gradient(to right, #050 ${100.*d.players/playmax}%, rgba(0,0,0,0) ${100.*d.players/playmax}% )`);
	}, exit => {
		exit.remove();
	});

	// mark rows
	tab.selectAll("tr").style('color', null);
	Array.from(f.sels).forEach( id => {
		tab.select(`tr[data-id="${id}"]`).style('color', '#fff');
	});

	tab.selectAll("tr").on('click', e => {
		select(f, e.target.parentNode.dataset.id);
		d3.select(e.target.parentNode).style('color', f.sels.has(e.target.parentNode.dataset.id) ? '#fff' : null);
	});

	d3.select("#namefilter").on( 'input', () => gametab(f) );

}

// horizontal bar chart for genres
function horizbar(f)	{

	var div = d3.select(`#${f.name}div .svg`).classed("verscroll", true);

	var margin = { top: 10, right: 30, bottom: 60, left: 20 },
		width = div.node().clientWidth - margin.left - margin.right,
		height = f.tab.length * 14;	// - margin.top - margin.bottom;

	if( ! f.svg )	{

		f.svg = div.append("svg")
			.attr("width", width + margin.left + margin.right)
			.append("g")
				.attr("transform", `translate(${margin.left},${margin.top})`);

		f.x = d3.scaleLinear()
			.range([ 0, width]);
		f.xaxis = f.svg.append("g");

		f.y = d3.scaleBand()
			.padding(0.2);
		f.yaxis = f.svg.append("g");

	}

	d3.select(f.svg.node().parentNode)
		.attr("height", height + margin.top + margin.bottom);

	// X axis
	f.x.domain([ 0, d3.max(f.tab, d => d.val) ]);
	f.xaxis
		.attr("transform", `translate(0,${height})`)
		.call(d3.axisBottom(f.x).tickFormat(d3.format( percflag ? ".0%" : ".0s")))
		.selectAll("text")
		.attr("transform", "translate(-10,0)rotate(-45)")
		.style("text-anchor", "end")
		.style("cursor", "default");

	// y axis
	f.y
		.domain(f.tab.sort( (a,b) => b.val - a.val ).map( d => d.name ))
		.range( [0, height ] );
	f.yaxis
		.call(d3.axisRight(f.y));

	const t = d3.transition().duration(750);

	f.svg.selectAll("rect")
		.data(f.tab)
	.join(enter => {
		enter.append("rect")
			.attr("x", f.x(0))
			.attr("y", d => f.y(d.name))
			.attr("width", d => f.x(d.val))
			.attr("height", f.y.bandwidth())
			.attr("fill", d => f.sels.has(d.id) ? 'red' : 'green')
			.attr("data-id", d => d.id)
			.style("opacity", 0.5);
	}, update => {
		update.call(s => s.transition(t)
			.attr("x", f.x(0))
			.attr("y", d => f.y(d.name))
			.attr("width", d => f.x(d.val))
			.attr("height", f.y.bandwidth())
			.attr("fill", d => f.sels.has(d.id) ? 'red' : 'green')
			.attr("data-id", d => d.id)
			.style("opacity", 0.5));
	}, exit => {
		exit.remove();
	});

	f.svg.selectAll("rect").on("click", (e) => {
		var id = e.target.dataset.id;
		select(f, id);
		d3.select(e.target).attr("fill", f.sels.has(id) ? 'red' : 'green');
	});

	f.yaxis.selectAll("text").on("click", (e) => {
		var name = d3.select(e.target).text();
		var id = Object.keys(f.idname).filter( d => f.idname[d][0] === name )[0];
		if( ! id )
			return;
		select(f, id);
		d3.select(e.target).attr("color", f.sels.has(id) ? '#fff' : null);
	}).style("cursor", "pointer");

	f.svg.selectAll("text").attr("color", null);
	f.svg.selectAll("text")
		.filter( d => f.sels.has(
			Object.keys(f.idname).filter(e => f.idname[e][0] === d)[0] ))
		.attr("color", "#fff");

}

function select(f, id)	{

	if(f.sels.has(id))
		f.sels.delete(id);
	else
		f.sels.add(id);

	readalldata();

}


// barchart for country and language
function barchart(f)	{

	var div = d3.select(`#${f.name}div .svg`).classed("horscroll", true);

	var margin = { top: 7, right: 10, bottom: 24, left: 35 },
		width = f.tab.length * 19 + 90 - margin.left - margin.right,
		height = div.node().clientHeight - margin.top - margin.bottom - 23;

	if( ! f.svg )	{

		f.svg = div.append("svg")
			.attr("height", height + margin.top + margin.bottom)
		    .append("g")
				.attr("transform", `translate(${margin.left},${margin.top})`);
		f.x = d3.scaleBand();
		f.xaxis = f.svg.append("g");

		f.y = d3.scaleLinear()
			.range( [ height, 0 ] );
		f.yaxis = f.svg.append("g");

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
	
	const t = d3.transition().duration(750);

	// bars
	f.svg.selectAll("rect")
	.data(f.tab)
	.join(enter => {
		enter.append("rect")
			.attr("x", d => f.x(d.name))
			.attr("y", d => f.y(d.val))
			.attr("width", f.x.bandwidth())
			.attr("height", d => height - f.y(d.val))
			.attr("fill", d => f.sels.has(d.id) ? 'red' : 'green')
			.attr("data-id", d => d.id)
			.append("title").text(d => d.title + '\n' + d.players);
	}, update => {
		update.call( s => s.transition(t)
			.attr("x", d => f.x(d.name))
			.attr("y", d => f.y(d.val))
			.attr("width", f.x.bandwidth())
			.attr("height", d => height - f.y(d.val))
			.attr("fill", d => f.sels.has(d.id) ? 'red' : 'green')
			.attr("data-id", d => d.id));
		update.select("title").text( d => d.title + '\n' + d.players);
	}, exit => {
		exit
			.transition()
			.duration(700)
			.remove();
	});

	f.xaxis.selectAll("text")
	.classed("pointer", true)
	.on("click", (e) => {
		var name = d3.select(e.target).text();
		var id = Object.keys(f.idname).filter( d => f.idname[d][0] === name )[0];
		select(f, id);
		d3.select(e.target).attr("color", f.sels.has(id) ? '#fff' : null);
	});

	f.svg.selectAll("rect").on("click", (e) => {
		var id = e.target.dataset.id;
		select(f, id);
		d3.select(e.target).attr("fill", f.sels.has(id) ? 'red' : 'green');
	});

	// mark xaxis text
	f.xaxis.selectAll("text").attr("color", null);
	f.xaxis.selectAll("text")
		.filter( d => f.sels.has(
			Object.keys(f.idname).filter(e => f.idname[e][0] === d)[0] ))
		.attr("color", "#fff");

	div.on("wheel", (e) => {

		var par = e.target.parentNode;
		par.scrollTo( { left: par.scrollLeft - e.wheelDeltaY, behavior: 'smooth' } );

	});

}

function readalldata()	{

	var pr = [];

	d3.select("#waiting").style("display", null);
	percflag = d3.select('#infodiv input[value="perc"]').property("checked");

	filters.forEach( f => {
		
		if( ! f.tab )
			return;			// skip info panel

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

		d3.selectAll("#infodiv input").on("change", () => {

			percflag = d3.select('#infodiv input[value="perc"]').property("checked");
			filters.forEach( f => {

				setvals(f);

				if(f.drawer)
					f.drawer(f);

			})

		});

		listfilters();

		var filt = d3.select('input[name="filter"]:checked').property("value");

		timegraph(filters.find( d => d.name === filt ));

		d3.selectAll('input[name="filter"]').on('change', (e) => {

			var filt = d3.select('input[name="filter"]:checked').property("value");
			timegraph(filters.find( d => d.name === filt ));
			d3.select(".tabsel").classed("tabsel", false);
			d3.select("#" + filt + "div").classed("tabsel", true);

		});

	});

}

function listfilters()	{

	var span = d3.select("#filterdiv span");
	span.selectAll("*").remove();

	filters.forEach( f => {

		if( ! f.tab )
			return;		// skip info panel

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

	d3.select("#filtclear").on('click', () => {

		filters.forEach( f => {

			if( ! f.tab )
				return;

			f.sels.clear();

		});

		listfilters();
		readalldata();

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

			if(id === '0')
				f.ref = players;
			else
				f.tab.push( {id: id, players: players} );

		});

		if(f.stater)
			f.stater(f);

	});

}

function makereqstr(filt)	{

	var req = '';
	filters.forEach( f => {

		if(f === filt || !f.tab)
			return;		// skip same graph

		req += `&${f.name}=${Array.from(f.sels).join(',')}`;

	});

	return req;

}
