function drawScene2(data) {
    let svg = d3.select("#chart").html("");
    const width = 1800, height = 900, margin = {top: 50, right: 0, bottom: 50, left: 125};
    const parseTime = d3.timeParse("%Y-%m-%d");
    const x = d3.scaleTime().range([0, width - margin.left - margin.right]);
    const y = d3.scaleLinear().range([height - margin.top - margin.bottom, 0]);

    const area = d3.area()
        .x((d, i) => x(d.data.date))
        .y0((d) => y(d[0]))
        .y1((d) => y(d[1]));

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    data.forEach((d) => {
        d.date = parseTime(d.date_added.split(" ")[0]);
        d.value = +d.show_id;
    });

    const countryData = d3.rollups(data, (v) => v.length, (d) => d.country);

    const topCountries = Array.from(countryData, ([country, value]) => ({
        country, value,
    }))
        .filter((d) => d.country !== "No country")
        .sort((a, b) => d3.descending(a.value, b.value))
        .slice(0, 5)
        .map((d) => d.country);

    const filteredData = data.filter((d) => topCountries.includes(d.country));

    const sumData = d3.rollups(filteredData, (v) => ({
        total: v.length,
        movie: v.filter((d) => d.type === "Movie").length,
        tvShow: v.filter((d) => d.type === "TV Show").length,
    }), (d) => d.country, (d) => d.date.getFullYear());
    sumData.sort((a, b) => d3.sum(b[1], (d) => d[1].total) - d3.sum(a[1], (d) => d[1].total));

    let newData = [];
    sumData.forEach((d) => {
        d[1].forEach((e) => {
            newData.push({
                date: new Date(e[0], 0, 1), country: d[0], total: e[1].total, movie: e[1].movie, tvShow: e[1].tvShow,
            });
        });
    });

    newData.sort((a, b) => a.date - b.date);

    x.domain(d3.extent(newData, (d) => d.date));
    y.domain([0, d3.max(newData, (d) => d.total)]);

    let nestedData = d3.group(newData, d => d.date);

    let stackInput = Array.from(nestedData, ([date, countries]) => {
        let obj = {date: date};
        topCountries.forEach(country => {
            let countryData = countries.find(({country: c}) => c === country);
            obj[country] = countryData ? countryData.movie + countryData.tvShow : 0;
        });
        return obj;
    });

    let stackedData = d3.stack().keys(topCountries)(stackInput);

    let tempArrays = Array.from({length: topCountries.length}, () => []);

    for (let i = 1; i < topCountries.length; i++) {
        for (let j = 0; j < stackedData[i].length; j++) {
            stackedData[i][j][0] = i;
            let usaValue = stackedData[0][j][1];
            let currentCountryValue = stackedData[i][j][1];

            let totalSubtractionValue = usaValue;
            for (let k = 1; k < i; k++) {
                totalSubtractionValue += tempArrays[k][j];
            }

            stackedData[i][j][1] -= totalSubtractionValue;
            tempArrays[i].push(stackedData[i][j][1]);
        }
    }

    const countryColors = {
        "United States": "#b20710",
        "India": "#d28d1f",
        "United Kingdom": "#ffe303",
        "Canada": "#00457E",
        "Japan": "#43592a",
    };

    g.selectAll(".area")
        .data(stackedData)
        .join("path")
        .attr("class", "area")
        .attr("stroke", "black")
        .attr("stroke-width", 3)
        .attr("opacity", 0.8)
        .attr("fill", (d, i) => countryColors[topCountries[i]])
        .attr("d", d3.area()
            .x((d, i) => x(d.data.date))
            .y0((d) => y(d[0]))
            .y1((d) => y(d[0])))
        .transition()
        .duration(2000)
        .attr("d", area);

    g.append("g")
        .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y")))
        .selectAll("text")
        .style("font-size", "18px")
        .style("font-family", "sans-serif");

    g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .tickSize(-width + margin.right + margin.left)
            .tickFormat(""))
        .selectAll("line")
        .attr("stroke", "darkblue")
        .attr("stroke-opacity", "0.2")
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
        .attr("text-anchor", "end")
        .selectAll("g")
        .data(topCountries)
        .join("g")
        .attr("transform", (d, i) => `translate(0,${height - margin.bottom - (2 - i) * 20})`);

    const countryFlags = {
        "United States": "🇺🇸", "India": "🇮🇳", "United Kingdom": "🇬🇧", "Canada": "🇨🇦", "Japan": "🇯🇵",
    };
    legend.append("text")
        .attr("x", 200)
        .attr("y", -145)
        .attr("dy", "0.32em")
        .text((d) => d);

    legend.append("rect")
        .attr("x", 210)
        .attr("y", -155)
        .attr("width", 19)
        .attr("height", 19)
        .attr("fill", (d, i) => countryColors[d]);

    let annotationText = `The United States 🇺🇸 stands as the highest content producer, with India 🇮🇳 coming in second place.
\r
What's particularly interesting is the substantial growth in content production that started around 2016, 
showcasing Netflix's strategic shift to enhance its global content offerings.`;

    g.append("text")
        .attr("x", 20)
        .attr("y", 25)
        .attr("dy", "1.2em")
        .style("font-size", "30px")
        .style("font-weight", "bold")
        .attr("font-family", "sans-serif")
        .text("Netflix's top content producing countries: A closer look");

    g.append("text")
        .attr("x", 0)
        .attr("y", 68)
        .style("font-size", "20px")
        .attr("font-family", "sans-serif")
        .selectAll("tspan")
        .data(annotationText.split("\n"))
        .join("tspan")
        .attr("x", 20)
        .attr("dy", "1.2em")
        .text((d) => d);

    let tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    g.selectAll(".dot")
        .data(newData)
        .join("circle")
        .attr("class", "dot")
        .attr("cx", (d) => x(d.date))
        .attr("cy", (d) => y(d.total))
        .attr("r", 8)
        .attr("stroke", "silver")
        .attr("stroke-width", 2)
        .attr("fill", (d) => countryColors[d.country])
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`<b>Year: ${d.date.getFullYear()}</b><br><b>Country: ${d.country} ${countryFlags[d.country]}</b><br><br>Movies: ${d.movie}<br>TV Shows: ${d.tvShow}<br><br><b>Movies + TV Shows: ${d.total}</b>`)
                .style("left", (event.pageX + 20) + "px")
                .style("width", "250px")
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

    const annotations = [{
        note: {
            title: "Surge in content production in India",
            label: "In 2018, there was a surge in content production from India, producing 339 movies and TV shows."
        },
        type: d3.annotationCalloutCircle,
        subject: {radius: 30},
        x: x(new Date(2018, 0, 1)),
        y: y(newData.find(d => d.date.getFullYear() === 2018 && d.country === "India").total),
        dy: -0.1,
        dx: -200,
        color: ["black"],
    },];

    const makeAnnotations = d3.annotation()
        .type(d3.annotationCalloutCircle)
        .annotations(annotations);

    g.append("g")
        .style("font-size", "18px")
        .style("font-family", "sans-serif")
        .call(makeAnnotations);

    let g2 = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    g2.selectAll(".dot")
        .data(newData)
        .join("circle")
        .attr("class", "dot")
        .attr("cx", (d) => x(d.date))
        .attr("cy", (d) => y(d.total))
        .attr("r", 8)
        .attr("stroke", "silver")
        .attr("stroke-width", 2)
        .attr("fill", (d) => countryColors[d.country])
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`<b>Year: ${d.date.getFullYear()}</b><br><b>Country: ${d.country} ${countryFlags[d.country]}</b><br><br>Movies: ${d.movie}<br>TV Shows: ${d.tvShow}<br><br><b>Movies + TV Shows: ${d.total}</b>`)
                .style("left", (event.pageX + 20) + "px")
                .style("width", "250px")
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

d3.csv('resources/data/netflix_titles.csv').then(function (data) {
    drawScene2(data);
});