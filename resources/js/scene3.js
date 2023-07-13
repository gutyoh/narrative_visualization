function getCountByType(data, year, rating, type) {
    return data.filter((d) => d.date_added.includes(year) && d.rating === rating && d.type === type).length;
}

function drawScene3(data) {
    let svg = d3.select("#chart").html("");
    const width = 1800, height = 900, margin = {top: 50, right: 0, bottom: 50, left: 125};
    const parseTime = d3.timeParse("%Y-%m-%d");
    const x = d3.scaleTime().range([0, width - margin.left - margin.right]);
    const y = d3.scaleLinear().range([height - margin.top - margin.bottom, 0]);

    const area = d3.area()
        .x((d) => x(d.date))
        .y0(y(0))
        .y1(y(0));

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    data.forEach((d) => {
        d.date = parseTime(d.date_added.split(" ")[0]);
    });

    const sumData = d3.rollups(
        data,
        (v) => v.length,
        (d) => {
            if (d.rating === "PG-13") return "TV-PG";
            return d.rating;
        },
        (d) => d.date.getFullYear()
    );

    let topRatings = new Map();
    sumData.forEach((d) => {
        let rating = d[0];
        let count = d3.sum(d[1], (e) => e[1]);
        topRatings.set(rating, count);
    });

    let top5Ratings = Array.from(topRatings.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map((d) => d[0]);

    let newData = sumData
        .filter((d) => top5Ratings.includes(d[0]))
        .flatMap((d) => {
            return d[1].map((e) => {
                return {date: new Date(e[0], 0, 1), rating: d[0], value: e[1]};
            });
        });

    newData.sort((a, b) => a.date - b.date);

    x.domain(d3.extent(newData, (d) => d.date));
    y.domain([0, d3.max(newData, (d) => d.value)]);

    const ageRatingColors = {
        "TV-MA": "#b20710",
        "TV-14": "#d28d1f",
        "TV-PG": "#ffe303",
        "R": "#00457E",
        "TV-Y7": "#43592a",
    };

    g.selectAll(".area")
        .data(d3.groups(newData, (d) => d.rating))
        .join("path")
        .attr("class", "area")
        .attr("fill", (d) => ageRatingColors[d[0]])
        .attr("stroke", "black")
        .attr("stroke-width", 3)
        .attr("opacity", 0.8)
        .attr("d", (d) => area(d[1]))
        .transition()
        .duration(2000)
        .attr("d", (d) => {
            area.y1((d) => y(d.value));
            return area(d[1]);
        });

    g.append("g")
        .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y")))
        .selectAll("text")
        .style("font-size", "18px")
        .style("font-family", "sans-serif");

    g.append("g")
        .attr("class", "grid")
        .call(
            d3.axisLeft(y)
                .tickSize(-width + margin.right + margin.left)
                .tickFormat("") // empty tick labels
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
        .data(top5Ratings)
        .join("g")
        .attr("transform", (d, i) => `translate(0,${height - margin.bottom - (2 - i) * 20})`);

    legend.append("rect")
        .attr("x", 130)
        .attr("y", -140)
        .attr("width", 19)
        .attr("height", 19)
        .attr("fill", (d) => ageRatingColors[d])
        .attr("opacity", 0.85);

    legend.append("text")
        .attr("x", 120)
        .attr("y", -130)
        .attr("dy", "0.32em")
        .text((d) => d);

    let annotationText =
        `We can observe a shift in Netflix's content strategy starting from 2016.
\r
The production of content for mature audiences, with ratings such as TV-MA and R, 
has significantly increased compared to content targeting younger audiences, such as TV-PG and TV-Y7. 
This shift reflects Netflix's focus on expanding its content offerings to cater to more mature audiences.`;

    g.append("text")
        .attr("x", 20)
        .attr("y", 40)
        .attr("dy", "1.2em")
        .style("font-size", "30px")
        .style("font-weight", "bold")
        .attr("font-family", "sans-serif")
        .text("Content distribution by age rating: Shifting the focus");

    g.append("text")
        .attr("x", 0)
        .attr("y", 100)
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
        .attr("cy", (d) => y(d.value))
        .attr("r", 8)
        .attr("stroke", "gray")
        .attr("stroke-width", 2)
        .attr("fill", (d) => ageRatingColors[d.rating])
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`Year: ${d.date.getFullYear()}<br>Rating: ${d.rating}<br>Movie count: ${getCountByType(data, d.date.getFullYear(), d.rating, "Movie")}<br>TV show count: ${getCountByType(data, d.date.getFullYear(), d.rating, "TV Show")}`)
                .style("left", event.pageX + 20 + "px")
                .style("top", event.pageY - 50 + "px");

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
                title: "Increase in Content for Mature Audiences",
                label: "Starting from 2016, Netflix has been adding more TV-14 and TV-MA content, targeting mature audiences.",
            },
            type: d3.annotationCalloutCircle,
            subject: {radius: 50},
            x: x(new Date(2016, 0, 1)),
            y: 660,
            dy: -45,
            dx: -120,
            color: ["black"],
        },
    ];

    const makeAnnotations = d3.annotation().annotations(annotations);
    g.append("g").style("font-size", "18px").style("font-family", "sans-serif").call(makeAnnotations);

    let g2 = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

    g2.selectAll(".dot")
        .data(newData)
        .join("circle")
        .attr("class", "dot")
        .attr("cx", (d) => x(d.date))
        .attr("cy", (d) => y(d.value))
        .attr("r", 8)
        .attr("stroke", "silver")
        .attr("stroke-width", 2)
        .attr("fill", (d) => ageRatingColors[d.rating])
        .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`<b>Year: ${d.date.getFullYear()}</b><br><b>Rating: ${d.rating}</b><br><br>Movies count: ${getCountByType(data, d.date.getFullYear(), d.rating, "Movie")}<br>TV shows count: ${getCountByType(data, d.date.getFullYear(), d.rating, "TV Show")}`)
                .style("left", event.pageX + 20 + "px")
                .style("top", event.pageY - 50 + "px");

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
    drawScene3(data);
});
