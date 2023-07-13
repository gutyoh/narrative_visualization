function drawScene1(data) {
    const svg = d3.select("#chart").html("");
    const width = 1800, height = 900, margin = {top: 50, right: 0, bottom: 50, left: 125};

    const parseTime = d3.timeParse("%Y-%m-%d");
    const x = d3.scaleTime().range([0, width - margin.left - margin.right]);
    const y = d3.scaleLinear().range([height - margin.top - margin.bottom, 0]);

    const area = d3.area()
        .x(d => x(d.date))
        .y0(y(0))
        .y1(y(0));

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    data.forEach(d => {
        d.date = parseTime(d.date_added.split(" ")[0]);
        d.value = +d.show_id;
    });

    const sumData = d3.rollups(data, v => v.length, d => d.type, d => d.date.getFullYear());

    const newData = [];
    sumData.forEach(d => {
        d[1].forEach(e => {
            newData.push({date: new Date(e[0], 0, 1), type: d[0], value: e[1]});
        });
    });

    newData.sort((a, b) => a.date - b.date);

    x.domain(d3.extent(newData, d => d.date));
    y.domain([0, d3.max(newData, d => d.value)]);

    g.selectAll(".area")
        .data(d3.groups(newData, d => d.type))
        .join("path")
        .attr("class", "area")
        .attr("fill", d => d[0] === "Movie" ? "#b20710" : "#221f1f")
        .attr("stroke", "black")
        .attr("stroke-width", 3)
        .attr("opacity", 0.8)
        .attr("d", d => area(d[1]))
        .transition()
        .duration(2000)
        .attr("d", d => {
            area.y1(d => y(d.value));
            return area(d[1]);
        });

    g.append("g")
        .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat('%Y')))
        .selectAll("text")
        .style("font-size", "18px")
        .style("font-family", "sans-serif");

    g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .tickSize(-width + margin.right + margin.left)
            .tickFormat("")
        )
        .selectAll("line")
        .attr("stroke", "darkblue")
        .attr("stroke-opacity", "0.6")
        .attr("shape-rendering", "crispEdges")
        .attr("stroke-dasharray", "3,3");

    g.append("g")
        .attr("transform", `translate(${width - margin.left - margin.right}, 0)`)
        .call(d3.axisRight(y))
        .selectAll("text")
        .style("font-size", "18px")
        .style("font-family", "sans-serif");

    const legend = g.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", "22px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "end")
        .selectAll("g")
        .data(["Movie", "TV Show"])
        .join("g")
        .attr("transform", (d, i) => `translate(0,${height - margin.bottom - (2 - i) * 20})`);

    legend.append("rect")
        .attr("x", 130)
        .attr("y", -100)
        .attr("width", 19)
        .attr("height", 19)
        .attr("fill", d => d === "Movie" ? "#b20710" : "#221f1f")
        .attr("opacity", 0.85);

    legend.append("text")
        .attr("x", 120)
        .attr("y", -90)
        .attr("dy", "0.32em")
        .text(d => d);

    let annotationText = `Netflix's content production started slowly, but it began to gain momentum in 2015.
A spike in content production occurred between 2016 and 2017, with a rapid increase in movies and TV shows.
\r
However, content production slowed down in 2020, possibly due to the impact of the COVID-19 pandemic.`;

    g.append("text")
        .attr("x", 20)
        .attr("y", 15)
        .attr("dy", "1.2em")
        .style("font-size", "30px")
        .style("font-weight", "bold")
        .attr("font-family", "sans-serif")
        .text("Content Growth: Movies and TV Shows added over the years");

    g.append("text")
        .attr("x", 0)
        .attr("y", 65)
        .style("font-size", "20px")
        .attr("font-family", "sans-serif")
        .selectAll("tspan")
        .data(annotationText.split('\n'))
        .join("tspan")
        .attr("x", 20)
        .attr("dy", "1.2em")
        .text(d => d);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    g.selectAll(".dot")
        .data(newData)
        .join("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.date))
        .attr("cy", d => y(d.value))
        .attr("r", 8)
        .attr("stroke", "gray")
        .attr("stroke-width", 2)
        .attr("fill", d => d.type === "Movie" ? "#b20710" : "#221f1f")
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`Year: ${d.date.getFullYear()}<br>${d.type} count: ${d.value}`)
                .style("left", (event.pageX + 20) + "px")
                .style("top", (event.pageY - 50) + "px");

            d3.select(event.currentTarget)
                .transition()
                .duration(200)
                .attr("r", 12);
        })
        .on("mouseout", (event, d) => {
            tooltip.transition().duration(500).style("opacity", 0);

            d3.select(event.currentTarget)
                .transition()
                .duration(200)
                .attr("r", 8);
        });

    const annotations = [
        {
            note: {
                title: "Fast Content Growth",
                label: "Starting from 2016, Netflix started significantly increasing its content library, marking a period of rapid growth."
            },
            type: d3.annotationCalloutCircle,
            subject: {radius: 30},
            x: x(new Date(2016, 0, 1)),
            y: y(newData.find(d => d.date.getFullYear() === 2016 && d.type === 'Movie').value),
            dy: -39,
            dx: -120,
            color: ["black"],
        },
    ];

    const makeAnnotations = d3.annotation()
        .annotations(annotations);
    g.append("g")
        .style("font-size", "18px")
        .style("font-family", "sans-serif")
        .call(makeAnnotations);

    const g2 = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    g2.selectAll(".dot")
        .data(newData)
        .join("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.date))
        .attr("cy", d => y(d.value))
        .attr("r", 8)
        .attr("stroke", "silver")
        .attr("stroke-width", 2)
        .attr("fill", d => d.type === "Movie" ? "#b20710" : "#221f1f")
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`<b>Year: ${d.date.getFullYear()}</b><br><b>${d.type} count: ${d.value}</b>`)
                .style("left", (event.pageX + 20) + "px")
                .style("top", (event.pageY - 50) + "px");

            d3.select(event.currentTarget)
                .transition()
                .duration(200)
                .attr("r", 12);
        })
        .on("mouseout", (event, d) => {
            tooltip.transition().duration(500).style("opacity", 0);

            d3.select(event.currentTarget)
                .transition()
                .duration(200)
                .attr("r", 8);
        });
}

d3.csv('resources/data/netflix_titles.csv').then(data => {
    drawScene1(data);
});