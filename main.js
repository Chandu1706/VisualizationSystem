
let carsData;

Promise.all([
    d3.json('cars1.json')
]).then(function (data) {
    carsData = data[0];


    createPieChart(carsData);

 
    createBarChart(carsData);

    createLineGraph(carsData);
}).catch(function (error) {
    console.log('Error loading data:', error);
});

function createPieChart(data) {
   
    const mpgByManufacturer = d3.rollup(data, v => d3.mean(v, d => d.MPG), d => d.Manufacturer);
    const mpgData = Array.from(mpgByManufacturer, ([manufacturer, mpg]) => ({ manufacturer, mpg }));

    // Set up dimensions for the chart
    const svgWidth = 400;
    const svgHeight = 300;
    const radius = Math.min(svgWidth, svgHeight) / 2;

    // Create SVG element for pie chart
    const svg = d3.select('#pieChart svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight)
        .append('g')
        .attr('transform', `translate(${svgWidth / 2}, ${svgHeight / 2})`);

    // Define color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Define pie generator
    const pie = d3.pie()
        .value(d => d.mpg);

    // Generate pie slices
    const arcs = pie(mpgData);

    // Create pie slices
    svg.selectAll('path')
        .data(arcs)
        .enter()
        .append('path')
        .attr('class', 'slice')
        .attr('d', d3.arc()
            .innerRadius(0)
            .outerRadius(radius)
        )
        .attr('fill', (d, i) => color(i))
        .on('mouseover', function (event, d) {
            const tooltip = d3.select('.tooltip');
            tooltip.style('display', 'block');
            tooltip.html(`<strong>${d.data.manufacturer}</strong><br>MPG: ${d.data.mpg.toFixed(2)}`)
                .style('left', `${event.pageX}px`)
                .style('top', `${event.pageY - 20}px`);
        })
        .on('mouseout', function () {
            d3.select('.tooltip').style('display', 'none');
        });

    // Add zoom functionality
    const zoom = d3.zoom()
        .scaleExtent([1, 10])
        .on('zoom', zoomed);

    d3.select('#pieChart svg').call(zoom);

    function zoomed(event) {
        svg.attr('transform', event.transform);
    }

    // Add buttons for zooming
    d3.select('#zoomIn').on('click', function () {
        svg.transition().duration(750).call(zoom.scaleBy, 1.2);
    });

    d3.select('#zoomOut').on('click', function () {
        svg.transition().duration(750).call(zoom.scaleBy, 0.8);
    });
}

function createBarChart(data) {
    // Group data by manufacturer and calculate average acceleration for each
    const accByManufacturer = d3.rollup(data, v => d3.mean(v, d => d.Acceleration), d => d.Manufacturer);
    const accData = Array.from(accByManufacturer, ([manufacturer, acceleration]) => ({ manufacturer, acceleration }));

    // Set up dimensions for the chart
    const svgWidth = 800; // Increased width
    const svgHeight = 300;
    const margin = { top: 20, right: 20, bottom: 50, left: 50 }; // Increased bottom margin for better label visibility
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    // Create SVG element for bar chart
    const svg = d3.select('#barChart svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight)
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Define scales for x and y axes
    const xScale = d3.scaleBand()
        .domain(accData.map(d => d.manufacturer))
        .range([0, width])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(accData, d => d.acceleration)])
        .range([height, 0]);

    // Create bars for each manufacturer
    const bars = svg.selectAll('.bar')
        .data(accData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.manufacturer))
        .attr('y', d => yScale(d.acceleration))
        .attr('width', xScale.bandwidth())
        .attr('height', d => height - yScale(d.acceleration))
        .attr('fill', 'steelblue');

    // Create x and y axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${height})`)
        .call(xAxis)
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .attr('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .style('font-size', '10px'); // Adjust font size for better visibility

    svg.append('g')
        .attr('class', 'y-axis')
        .call(yAxis);

    // Add labels
    svg.append('text')
        .attr('class', 'label')
        .attr('transform', `translate(${width / 2}, ${height + margin.top + 20})`) // Adjust label position
        .style('text-anchor', 'middle')
        .text('Manufacturer');

    svg.append('text')
        .attr('class', 'label')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('Acceleration');

    // Add brushing functionality
    const brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on('end', brushed);

    svg.append('g')
        .attr('class', 'brush')
        .call(brush);

    function brushed(event) {
        if (!event.selection) return;

        const [x0, x1] = event.selection.map(xScale.invert);
        const selectedYears = carsData.filter(d => d['Model Year'] >= x0 && d['Model Year'] <= x1).map(d => d['Model Year']);
        updateLineGraph(selectedYears);
        updatePieChart(selectedYears);
    }
}

function createLineGraph(data) {
    // Group data by model year and calculate average MPG for each
    const mpgByYear = d3.rollup(data, v => d3.mean(v, d => d.MPG), d => d['Model Year']);
    const mpgData = Array.from(mpgByYear, ([year, mpg]) => ({ year, mpg }));

    // Set up dimensions for the chart
    const svgWidth = 800;
    const svgHeight = 300;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    // Create SVG element for line graph
    const svg = d3.select('#lineGraph svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight)
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Define scales for x and y axes
    const xScale = d3.scaleLinear()
        .domain([d3.min(mpgData, d => d.year), d3.max(mpgData, d => d.year)])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(mpgData, d => d.mpg)])
        .range([height, 0]);

    // Define line generator
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.mpg));

    // Create line path
    svg.append('path')
        .datum(mpgData)
        .attr('class', 'line')
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', 'steelblue');

    // Create x and y axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${height})`)
        .call(xAxis);

    svg.append('g')
        .attr('class', 'y-axis')
        .call(yAxis);

    // Add labels
    svg.append('text')
        .attr('class', 'label')
        .attr('transform', `translate(${width / 2}, ${height + margin.top + 10})`)
        .style('text-anchor', 'middle')
        .text('Model Year');

    svg.append('text')
        .attr('class', 'label')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('MPG');

    // Add brushing functionality
    const brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on('end', brushed);

    svg.append('g')
        .attr('class', 'brush')
        .call(brush);

    function brushed(event) {
        if (!event.selection) return;

        const [x0, x1] = event.selection.map(xScale.invert);
        const selectedYears = mpgData.filter(d => d.year >= x0 && d.year <= x1).map(d => d.year);
        updateBarChart(selectedYears);
        updatePieChart(selectedYears);
    }
}

function updateLineGraph(selectedYears) {
    const mpgByYear = d3.rollup(carsData.filter(d => selectedYears.includes(d['Model Year'])), v => d3.mean(v, d => d.MPG), d => d['Model Year']);
    const mpgData = Array.from(mpgByYear, ([year, mpg]) => ({ year, mpg }));

    const svg = d3.select('#lineGraph svg').select('g');

    const xScale = d3.scaleLinear()
        .domain([d3.min(mpgData, d => d.year), d3.max(mpgData, d => d.year)])
        .range([0, 800 - 40 - 20]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(mpgData, d => d.mpg)])
        .range([300 - 20 - 30, 0]);

    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.mpg));

    svg.select('.line')
        .datum(mpgData)
        .transition()
        .duration(500)
        .attr('d', line);
}

function updateBarChart(selectedYears) {
    const accByManufacturer = d3.rollup(carsData.filter(d => selectedYears.includes(d['Model Year'])), v => d3.mean(v, d => d.Acceleration), d => d.Manufacturer);
    const accData = Array.from(accByManufacturer, ([manufacturer, acceleration]) => ({ manufacturer, acceleration }));

    const svg = d3.select('#barChart svg').select('g');

    const xScale = d3.scaleBand()
        .domain(accData.map(d => d.manufacturer))
        .range([0, 800 - 50 - 20])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(accData, d => d.acceleration)])
        .range([300 - 20 - 50, 0]);

    const bars = svg.selectAll('.bar')
        .data(accData);

    bars.enter()
        .append('rect')
        .attr('class', 'bar')
        .merge(bars)
        .transition()
        .duration(500)
        .attr('x', d => xScale(d.manufacturer))
        .attr('y', d => yScale(d.acceleration))
        .attr('width', xScale.bandwidth())
        .attr('height', d => 300 - 20 - 50 - yScale(d.acceleration));

    bars.exit().remove();

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.select('.x-axis')
        .transition()
        .duration(500)
        .call(xAxis)
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .attr('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .style('font-size', '10px');

    svg.select('.y-axis')
        .transition()
        .duration(500)
        .call(yAxis);
}

function updatePieChart(selectedYears) {
    const mpgByManufacturer = d3.rollup(carsData.filter(d => selectedYears.includes(d['Model Year'])), v => d3.mean(v, d => d.MPG), d => d.Manufacturer);
    const mpgData = Array.from(mpgByManufacturer, ([manufacturer, mpg]) => ({ manufacturer, mpg }));

    const svg = d3.select('#pieChart svg').select('g');

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const pie = d3.pie()
        .value(d => d.mpg);

    const arcs = pie(mpgData);

    svg.selectAll('path')
        .data(arcs)
        .transition()
        .duration(500)
        .attr('d', d3.arc()
            .innerRadius(0)
            .outerRadius(Math.min(400, 300) / 2)
        )
        .attr('fill', (d, i) => color(i));
}
