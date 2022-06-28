// https://docs.google.com/spreadsheets/d/1HdRliueGeYKPfcZcbPaB_8ky_X3azsLAvNxkSwzj-38/export?gid=0&format=csv&id=1HdRliueGeYKPfcZcbPaB_8ky_X3azsLAvNxkSwzj-38

Promise.all([
    d3.json("data.json"),
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
    d3.json("cache.json"),
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json"),
    d3.json("map.json"),
]).then(function (files) {
    load(...files)
})

function load(data, map, coords, map2, map3) {
    var width = window.innerWidth, height = window.innerHeight;
    var svg = d3.select("#map")
        .attr("width", width)
        .attr("height", height)
    
    var projection = d3.geoOrthographic()
        .scale(200)
        .translate([width / 2, height / 2])
        // .rotate([99.6, -36.2])

    var tooltip = d3.select("body").append("div")
        .attr("class", "card title shadow text-white bg-dark mt-3 mr-3 p-3")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("right", -1000 + "px")
        .style("top", -1000 + "px")
        .style("max-width", 200 + "px")
    
    var path = d3.geoPath()
        .projection(projection)

    var v0 = 0, r0 = 0, q0 = 0
    function dragstarted() {
        v0 = versor.cartesian(projection.invert(d3.mouse(this)));
        r0 = projection.rotate()
        q0 = versor(r0)
    }
        
    function dragged() {
        var v1 = versor.cartesian(projection.rotate(r0).invert(d3.mouse(this))),
            q1 = versor.multiply(q0, versor.delta(v0, v1)),
            r1 = versor.rotation(q1)
        projection.rotate(r1)
        update(1)
    }

    function zoomed() {
        projection.scale(200 * d3.event.transform.k)
        update(1)
    }
    
    svg.call(d3.zoom()
        .scaleExtent([0.2, 10])
        .on("zoom", zoomed)
        .on("end", function() {update(2)}))

    svg = svg.append("g")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", function() {
                update(2)
        }))

    var topo = topojson.feature(map, map.objects.countries).features
    var topo2 = topojson.feature(map2, map2.objects.countries).features
    var lakes = topojson.feature(map3, map3.objects.ne_10m_lakes).features,
        rivers = topojson.feature(map3, map3.objects.ne_10m_rivers_lake_centerlines).features

    svg.append("path")
        .datum({type: "Sphere"})
        .attr("d", path)
        .attr("class", "sphere")
        .attr("fill", "#aadafc")
    
    var g = svg.append("g")

    var g2 = svg.append("g")

    function generate_tooltip(d) {
        var res = "<ul class=\"list-group list-group-flush bg-dark\">"
        res += "<li class=\"list-group-item text-white bg-dark\"><h5 class=\"mb-0 text-white\">" + d[0] + "</h5><p class=\"text-white mt-0\">" + count[d[0]] +
            " senior" + (count[d[0]] == 1 ? " is" : "s are") + " going here.</p></li>"
        for (const uni in d[1]) {
            res += "<li class=\"list-group-item text-white bg-dark\">"
            res += "<strong>" + uni + "</strong> <small>(" + d[1][uni].length + ")</small><ul>"
            d[1][uni].forEach(person => {
                var n = person.split(", ")
                res += "<li>" + n[1] + " " + n[0]
                if (person in notes) res += " <small class=\"text-white-50\">(" + notes[person] + ")</small>"
                res += "</li>"
            })
            res += "</ul></li>"
        }
        res += "</ul>"
        return res
    }
        
    

    var graticule = d3.geoGraticule10();

    cts = {}
    person_cts = {}
    console.log(data)
    Object.keys(data.people).forEach(person => {
        person_cts[person] = {}
        var locations = data.people[person]
        locations.forEach(loc => {
            if (Array.isArray(loc)) {
                if (!(loc[0] in cts)) cts[loc[0]] = 0
                if (!(loc[0] in person_cts[person])) person_cts[person][loc[0]] = 0
                cts[loc[0]]++
                person_cts[person][loc[0]]++
            }
            else {
                data.trips[loc].forEach(loc_t => {
                    if (!(loc_t[0] in cts)) cts[loc_t[0]] = 0
                    if (!(loc_t[0] in person_cts[person])) person_cts[person][loc_t[0]] = 0
                    cts[loc_t[0]]++
                    person_cts[person][loc_t[0]]++
                })
            }
        })
    })

    arcs = {}
    Object.keys(cts).forEach(loc => {
        arcs[loc] = []
        var tot = cts[loc]
        var cur = 0
        Object.keys(data.people).forEach(person => {
            if (loc in person_cts[person]) {
                var endAngle = cur + ((person_cts[person][loc] / tot) / (Math.PI / 2))
                arcs[loc].push(d3.arc()
                    .innerRadius(0)
                    .outerRadius(100)
                    .startAngle(cur)
                    .endAngle(endAngle))
                cur = endAngle
            }
        })
    })
    
    update(2)

    function update(topography) {

        // console.log(world)
        g.selectAll("*").remove()
        d3.select(".sphere")
            .datum({type: "Sphere"})
            .attr("d", path)
        var gg = g.append("path")
            .attr("class", "grid")
            .datum(graticule)
            .attr("d", function(d) {
                return path(d)
            })
            .attr("stroke", "white")
            .attr("stroke-width", "0.5px")
            .attr("fill", "none")

        g.selectAll(".map")
            .data(topography == 2 ? topo2 : topo)
            .enter()
            .append("path")
                .attr("class", "map")
                .attr("d", path)
                .attr("stroke-width", "0.3px")
                .attr("stroke", "black")
                .attr("fill", "#b8d8b5")

        if (topography == 2) {
            g.selectAll(".lake")
                .data(lakes)
                .enter()
                .append("path")
                    .attr("d", path)
                    .attr("fill", "#aadafc")
                    .attr("stroke-width", "0.3px")
                    .attr("stroke", "black")

            // g.selectAll(".river")
            //     .data(rivers)
            //     .enter()
            //     .append("path")
            //         .attr("d", path)
            //         .attr("stroke", "#aadafc")
            //         .attr("stroke-width", "0.3px")
            //         .attr("fill", "none")
        }
    
        g.selectAll("circle")
            .data(Object.entries(cts))
            .enter()
            .append("circle")
                .attr("cx", d => projection([coords[d[0]][1], coords[d[0]][0]])[0])
                .attr("cy", d => projection([coords[d[0]][1], coords[d[0]][0]])[1])
                .attr("r", d => (1 + 2 * Math.log(1 + d[1])))
                .attr("fill", "red")
                .attr("stroke", "black")
                .on("mouseover", d => {
                    console.log(d)
                    tooltip.style("left", d3.event.x + "px")
                        .style("top", d3.event.y + "px")
                    tooltip.html(`<h3 class="text-white">${d[0]}</h3> (${d[1]} ${d[1] == 1 ? 'person-trip' : 'people-trips'})`)
                    tooltip.transition()
                        .duration(50)
                        .style("opacity", 1)
                })
                .on("mousemove", d => {
                    tooltip.style("left", d3.event.x + "px")
                        .style("top", d3.event.y + "px")
                })
                .on("mouseout", d => {
                    tooltip.style("opacity", 0)
                    tooltip.style("left", -100 + "px")
                        .style("top", -100 + "px")
                })
    }
}