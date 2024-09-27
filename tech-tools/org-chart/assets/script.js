const buColors = {
    'Management': '#0000FF',
    'Sales': '#800080',
    'Marketing': '#008000'
};

const standardColors = [
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080'
];

let data = {
    company: "Acme Corporation",
    name: "Luke Warm",
    title: "VP Marketing/Sales",
    department: "Management",
    email: "lwarm@example.com",
    phone: "(234) 555-6789",
    linkedin: "https://www.linkedin.com/in/lukewarm",
    buText: "MGT",
    buColor: "#0000FF",
    children: [
        {
            name: "Meg Meehan Hoffa",
            title: "Sales",
            department: "Sales",
            email: "mhoffa@example.com",
            phone: "(234) 555-6789",
            linkedin: "https://www.linkedin.com/in/megmeehan",
            buText: "SAL",
            buColor: "#800080",
            children: [
                {
                    name: "Dot Stubadd",
                    title: "Sales Rep",
                    department: "Sales",
                    email: "dstubadd@example.com",
                    phone: "(234) 555-6789",
                    linkedin: "https://www.linkedin.com/in/dotstubadd",
                    buText: "SAL",
                    buColor: "#800080"
                },
                {
                    name: "Lotta B. Essen",
                    title: "Sales Rep",
                    department: "Sales",
                    email: "lessen@example.com",
                    phone: "(234) 555-6789",
                    linkedin: "https://www.linkedin.com/in/lottabessen",
                    buText: "SAL",
                    buColor: "#800080"
                }
            ]
        },
        {
            name: "Al Ligori",
            title: "Marketing",
            department: "Marketing",
            email: "aligori@example.com",
            phone: "(234) 555-6789",
            linkedin: "https://www.linkedin.com/in/alligori",
            buText: "MKT",
            buColor: "#008000",
            children: [
                {
                    name: "April Lynn Parris",
                    title: "Events Mgr",
                    department: "Marketing",
                    email: "aparris@example.com",
                    phone: "(234) 555-6789",
                    linkedin: "https://www.linkedin.com/in/aprilparris",
                    buText: "MKT",
                    buColor: "#008000"
                }
            ]
        }
    ]
};

const margin = {top: 40, right: 120, bottom: 20, left: 120};
let width = window.innerWidth - margin.right - margin.left;
let height = window.innerHeight * 0.9 - margin.top - margin.bottom;

const svg = d3.select("#chart-container").append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

svg.append("text")
    .attr("class", "company-title")
    .text(data.company);

const tree = d3.tree().size([width, height]);

let root = d3.hierarchy(data);
root.x0 = width / 2;
root.y0 = 0;

let nodeId = 0;

function update(source) {
    const treeData = tree(root);

    const nodes = treeData.descendants();
    const links = treeData.descendants().slice(1);

    nodes.forEach(d => {
        d.y = d.depth * 180;
    });

    const node = svg.selectAll('g.node')
        .data(nodes, d => d.id || (d.id = ++nodeId));

    const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr("transform", d => `translate(${source.x0},${source.y0})`)
        .on('click', (event, d) => {
            if (d.children) {
                d._children = d.children;
                d.children = null;
            } else {
                d.children = d._children;
                d._children = null;
            }
            update(d);
        });

    function calculateNodeSize(d) {
        const nameLength = d.data.name.length;
        const titleLength = d.data.title.length;
        const width = Math.max(nameLength, titleLength) * 7 + 150;
        const height = 120;
        return { width, height };
    }

    nodeEnter.append('rect')
        .attr('width', d => calculateNodeSize(d).width)
        .attr('height', d => calculateNodeSize(d).height)
        .attr('x', d => -calculateNodeSize(d).width / 2)
        .attr('y', d => -calculateNodeSize(d).height / 2)
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('fill', '#2d2d2d');

    nodeEnter.append('rect')
        .attr('class', 'bu-color')
        .attr('width', 10)
        .attr('height', d => calculateNodeSize(d).height)
        .attr('x', d => -calculateNodeSize(d).width / 2)
        .attr('y', d => -calculateNodeSize(d).height / 2)
        .attr('fill', d => d.data.buColor);

    nodeEnter.append('rect')
        .attr('class', 'bu-flag')
        .attr('width', d => Math.max(d.data.buText.length * 10, 30))
        .attr('height', 20)
        .attr('x', d => calculateNodeSize(d).width / 2 - Math.max(d.data.buText.length * 10, 30) - 5)
        .attr('y', d => -calculateNodeSize(d).height / 2 + 5)
        .attr('rx', 10)
        .attr('ry', 10)
        .attr('fill', d => d.data.buColor);

    nodeEnter.append('text')
        .attr('class', 'bu-text')
        .attr('x', d => calculateNodeSize(d).width / 2 - Math.max(d.data.buText.length * 5, 15) - 5)
        .attr('y', d => -calculateNodeSize(d).height / 2 + 18)
        .attr('fill', '#FFFFFF')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '10px')
        .text(d => d.data.buText);

    nodeEnter.append('text')
        .attr('dy', '-1.5em')
        .attr('x', d => -calculateNodeSize(d).width / 2 + 15)
        .attr('text-anchor', 'start')
        .text(d => d.data.name)
        .style('font-weight', 'bold');

    nodeEnter.append('text')
        .attr('dy', '0em')
        .attr('x', d => -calculateNodeSize(d).width / 2 + 15)
        .attr('text-anchor', 'start')
        .text(d => d.data.title);

    nodeEnter.append('text')
        .attr('dy', '1.5em')
        .attr('x', d => -calculateNodeSize(d).width / 2 + 15)
        .attr('text-anchor', 'start')
        .text(d => d.data.department)
        .attr('class', 'department');

    nodeEnter.append('text')
        .attr('dy', '3em')
        .attr('x', d => -calculateNodeSize(d).width / 2 + 15)
        .attr('text-anchor', 'start')
        .text('Email')
        .style('font-size', '10px');

    nodeEnter.append('text')
        .attr('dy', '3em')
        .attr('x', d => -calculateNodeSize(d).width / 2 + 100)
        .attr('text-anchor', 'start')
        .text('Phone')
        .style('font-size', '10px');

    nodeEnter.append('text')
        .attr('class', 'linkedin-link')
        .attr('dy', '4.5em')
        .attr('x', d => -calculateNodeSize(d).width / 2 + 15)
        .attr('text-anchor', 'start')
        .text('LinkedIn')
        .style('font-size', '10px')
        .on('click', (event, d) => {
            event.stopPropagation();
            window.open(d.data.linkedin, '_blank');
        });

    nodeEnter.append('circle')
        .attr('class', 'expand-collapse-circle')
        .attr('cx', d => calculateNodeSize(d).width / 2 - 30)
        .attr('cy', d => calculateNodeSize(d).height / 2 - 15)
        .attr('r', 8)
        .attr('fill', '#4a4a4a')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1);

    nodeEnter.append('text')
        .attr('class', 'expand-collapse')
        .attr('x', d => calculateNodeSize(d).width / 2 - 30)
        .attr('y', d => calculateNodeSize(d).height / 2 - 11)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .text(d => d.children || d._children ? (d.children ? '-' : '+') : '')
        .on('click', (event, d) => {
            event.stopPropagation();
            if (d.children) {
                d._children = d.children;
                d.children = null;
            } else if (d._children) {
                d.children = d._children;
                d._children = null;
            }
            update(d);
        });

    nodeEnter.append('circle')
        .attr('class', 'edit-button-circle')
        .attr('cx', d => calculateNodeSize(d).width / 2 - 10)
        .attr('cy', d => calculateNodeSize(d).height / 2 - 15)
        .attr('r', 8)
        .attr('fill', '#4a4a4a')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1);

    nodeEnter.append('text')
        .attr('class', 'edit-button')
        .attr('x', d => calculateNodeSize(d).width / 2 - 10)
        .attr('y', d => calculateNodeSize(d).height / 2 - 11)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .text('✎')
        .on('click', (event, d) => {
            event.stopPropagation();
            editNode(event, d);
        });

        const nodeUpdate = nodeEnter.merge(node);

nodeUpdate.transition()
.duration(750)
.attr("transform", d => `translate(${d.x},${d.y})`);

nodeUpdate.select('rect')
.attr('width', d => calculateNodeSize(d).width)
.attr('height', d => calculateNodeSize(d).height)
.attr('x', d => -calculateNodeSize(d).width / 2)
.attr('y', d => -calculateNodeSize(d).height / 2);

nodeUpdate.select('.bu-color')
.attr('fill', d => d.data.buColor)
.attr('height', d => calculateNodeSize(d).height)
.attr('x', d => -calculateNodeSize(d).width / 2)
.attr('y', d => -calculateNodeSize(d).height / 2);

nodeUpdate.select('.bu-flag')
.attr('width', d => Math.max(d.data.buText.length * 10, 30))
.attr('x', d => calculateNodeSize(d).width / 2 - Math.max(d.data.buText.length * 10, 30) - 5)
.attr('y', d => -calculateNodeSize(d).height / 2 + 5)
.attr('fill', d => d.data.buColor);

nodeUpdate.select('.bu-text')
.attr('x', d => calculateNodeSize(d).width / 2 - Math.max(d.data.buText.length * 5, 15) - 5)
.attr('y', d => -calculateNodeSize(d).height / 2 + 18)
.text(d => d.data.buText);

nodeUpdate.selectAll('text')
.filter(function() { return !this.classList.contains('expand-collapse') && !this.classList.contains('edit-button'); })
.attr('x', d => -calculateNodeSize(d).width / 2 + 15);

nodeUpdate.select('.expand-collapse-circle')
.attr('cx', d => calculateNodeSize(d).width / 2 - 30)
.attr('cy', d => calculateNodeSize(d).height / 2 - 15);

nodeUpdate.select('.expand-collapse')
.attr('x', d => calculateNodeSize(d).width / 2 - 30)
.attr('y', d => calculateNodeSize(d).height / 2 - 11)
.text(d => d.children || d._children ? (d.children ? '-' : '+') : '');

nodeUpdate.select('.edit-button-circle')
.attr('cx', d => calculateNodeSize(d).width / 2 - 10)
.attr('cy', d => calculateNodeSize(d).height / 2 - 15);

nodeUpdate.select('.edit-button')
.attr('x', d => calculateNodeSize(d).width / 2 - 10)
.attr('y', d => calculateNodeSize(d).height / 2 - 11);

const nodeExit = node.exit().transition()
.duration(750)
.attr("transform", d => `translate(${source.x},${source.y})`)
.remove();

const link = svg.selectAll('path.link')
.data(links, d => d.id);

const linkEnter = link.enter().insert('path', "g")
.attr("class", "link")
.attr('d', d => {
const o = {x: source.x0, y: source.y0};
return diagonal(o, o);
});

const linkUpdate = linkEnter.merge(link);

linkUpdate.transition()
.duration(750)
.attr('d', d => diagonal(d, d.parent));

link.exit().transition()
.duration(750)
.attr('d', d => {
const o = {x: source.x, y: source.y};
return diagonal(o, o);
})
.remove();

nodes.forEach(d => {
d.x0 = d.x;
d.y0 = d.y;
});

function diagonal(s, d) {
return `M ${s.x} ${s.y}
    C ${s.x} ${(s.y + d.y) / 2},
      ${d.x} ${(s.y + d.y) / 2},
      ${d.x} ${d.y}`;
}
}

update(root);

function updateJSON() {
document.getElementById('jsonBox').value = JSON.stringify(data, null, 2);
}

updateJSON();

document.getElementById('jsonBox').addEventListener('change', function() {
try {
data = JSON.parse(this.value);
root = d3.hierarchy(data);
root.x0 = width / 2;
root.y0 = 0;
update(root);
svg.select('.company-title').text(data.company);
} catch (error) {
console.error("Invalid JSON:", error);
}
});

function editNode(event, d) {
const form = d3.select("body").append("div")
.attr("class", "editForm")
.style("left", (event.pageX + 10) + "px")
.style("top", (event.pageY - 25) + "px");

form.append("span")
.attr("class", "close-button")
.html("&times;")
.on("click", () => form.remove());

const nameInput = form.append("input")
.attr("type", "text")
.attr("placeholder", "Name")
.attr("value", d.data.name);

const titleInput = form.append("input")
.attr("type", "text")
.attr("placeholder", "Title")
.attr("value", d.data.title);

const departmentSelect = form.append("select")
.attr("placeholder", "Department");

Object.keys(buColors).forEach(dept => {
departmentSelect.append("option")
.attr("value", dept)
.text(dept);
});

departmentSelect.property("value", d.data.department);

const emailInput = form.append("input")
.attr("type", "text")
.attr("placeholder", "Email")
.attr("value", d.data.email);

const phoneInput = form.append("input")
.attr("type", "text")
.attr("placeholder", "Phone")
.attr("value", d.data.phone);

const linkedinInput = form.append("input")
.attr("type", "text")
.attr("placeholder", "LinkedIn URL")
.attr("value", d.data.linkedin);

const buTextInput = form.append("input")
.attr("type", "text")
.attr("placeholder", "BU Text")
.attr("value", d.data.buText);

const buColorSelect = form.append("select")
.attr("placeholder", "BU Flag Color");

standardColors.forEach(color => {
buColorSelect.append("option")
.attr("value", color)
.text(color);
});

buColorSelect.property("value", d.data.buColor);

// Function to update the node data and refresh the chart
function updateNodeData() {
d.data.name = nameInput.property("value");
d.data.title = titleInput.property("value");
d.data.department = departmentSelect.property("value");
d.data.email = emailInput.property("value");
d.data.phone = phoneInput.property("value");
d.data.linkedin = linkedinInput.property("value");
d.data.buText = buTextInput.property("value");
d.data.buColor = buColorSelect.property("value");
update(d);
updateJSON();
}

// Add event listeners for auto-updating
nameInput.on("input", updateNodeData);
titleInput.on("input", updateNodeData);
departmentSelect.on("change", updateNodeData);
emailInput.on("input", updateNodeData);
phoneInput.on("input", updateNodeData);
linkedinInput.on("input", updateNodeData);
buTextInput.on("input", updateNodeData);
buColorSelect.on("change", updateNodeData);

form.append("button")
.text("Add Child")
.on("click", () => {
if (!d.data.children) d.data.children = [];
const newChild = {
    name: "New Employee",
    title: "New Title",
    department: "Management",
    email: "email@example.com",
    phone: "(123) 456-7890",
    linkedin: "https://www.linkedin.com/in/newemployee",
    buText: "NEW",
    buColor: standardColors[0]
};
d.data.children.push(newChild);
if (!d.children) d.children = [];
d.children.push({data: newChild});
update(d);
updateJSON();
form.remove();
});

form.append("button")
.text("Delete")
.on("click", () => {
if (d.parent) {
    const index = d.parent.data.children.indexOf(d.data);
    if (index > -1) {
        d.parent.data.children.splice(index, 1);
        d.parent.children = d.parent.children.filter(child => child !== d);
    }
    update(d.parent);
    updateJSON();
}
form.remove();
});
}

const zoom = d3.zoom()
.scaleExtent([0.1, 3])
.on("zoom", (event) => {
svg.attr("transform", event.transform);
});

d3.select("#chart-container").call(zoom);

window.addEventListener('resize', () => {
width = window.innerWidth - margin.right - margin.left;
height = window.innerHeight * 0.9 - margin.top - margin.bottom;
d3.select("#chart-container svg")
.attr("width", width + margin.right + margin.left)
.attr("height", height + margin.top + margin.bottom);
tree.size([width, height]);
update(root);
});

// Initial update to ensure everything is rendered correctly
update(root);