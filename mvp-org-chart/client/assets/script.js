const buColors = {
    'Management': '#0000FF',
    'Sales': '#800080',
    'Marketing': '#008000'
};

const standardColors = [
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080'
];

let data = {};

function getToken(){
    return localStorage.getItem("token");
}

async function api(method,url,body){
  return fetch(url,{method,headers:{"Content-Type":"application/json","Authorization":"Bearer "+getToken()},body:body?JSON.stringify(body):undefined});
}

const margin = {top: 40, right: 120, bottom: 20, left: 120};
let width = window.innerWidth - margin.right - margin.left;
let height = window.innerHeight * 0.9 - margin.top - margin.bottom;

const svg = d3.select("#chart-container").append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const companyTitle = svg.append("text")
    .attr("class", "company-title")
    .attr("x", -margin.left + 10)  // 10px from the left edge
    .attr("y", -margin.top + 20)   // 20px from the top edge
    .text("");

svg.append("text")
    .attr("class", "company-title")
    .attr("x", width / 2)
    .attr("y", -20)
    .text("");

const tree = d3.tree().size([width, height]);

let root;


let nodeId = 0;
const dragBehavior = d3.drag()
    .on('start', dragStarted)
    .on('drag', dragged)
    .on('end', dragEnded);

function update(source) {
    const treeData = tree(root);

    const nodes = treeData.descendants();
    const links = treeData.descendants().slice(1);

    nodes.forEach(d => {
        d.y = d.depth * 180;
    });
    companyTitle.attr('x', root.x).text(data.company);

    const node = svg.selectAll('g.node')
        .data(nodes, d => d.id || (d.id = ++nodeId));

    const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .call(dragBehavior)
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
        })
        .on('contextmenu', (event, d) => {
            event.preventDefault();
            nodeMenu(event, d);
        });

        function calculateNodeSize(d) {
            const nameLength = d.data.name.length;
            const titleLength = d.data.title.length;
            const buFlagWidth = Math.max(d.data.buText.length * 10, 30);
            const width = Math.max(nameLength, titleLength) * 7 + 150;
            const height = 120;
            
            return { width, height, buFlagWidth };
        }

    // Main card rectangle
    nodeEnter.append('rect')
        .attr('width', d => calculateNodeSize(d).width)
        .attr('height', d => calculateNodeSize(d).height)
        .attr('x', d => -calculateNodeSize(d).width / 2)
        .attr('y', d => -calculateNodeSize(d).height / 2)
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('fill', '#2d2d2d');

    // Left color bar
    nodeEnter.append('rect')
        .attr('class', 'bu-color')
        .attr('width', 10)
        .attr('height', d => calculateNodeSize(d).height)
        .attr('x', d => -calculateNodeSize(d).width / 2)
        .attr('y', d => -calculateNodeSize(d).height / 2)
        .attr('fill', d => d.data.buColor);

    // BU flag
    nodeEnter.append('rect')
        .attr('class', 'bu-flag')
        .attr('width', d => calculateNodeSize(d).buFlagWidth)
        .attr('height', 20)
        .attr('x', d => calculateNodeSize(d).width / 2 - calculateNodeSize(d).buFlagWidth - 5)
        .attr('y', d => -calculateNodeSize(d).height / 2 + 5)
        .attr('rx', 10)
        .attr('ry', 10)
        .attr('fill', d => d.data.buColor);

    // BU text
    nodeEnter.append('text')
        .attr('class', 'bu-text')
        .attr('x', d => calculateNodeSize(d).width / 2 - calculateNodeSize(d).buFlagWidth / 2 - 5)
        .attr('y', d => -calculateNodeSize(d).height / 2 + 18)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .text(d => d.data.buText);

    nodeEnter.append('image')
        .attr('class','member-photo')
        .attr('width',50)
        .attr('height',50)
        .attr('x', d => -calculateNodeSize(d).width / 2 + 15)
        .attr('y', d => -calculateNodeSize(d).height / 2 + 30)
        .attr('href', d => d.data.photo)
        .style('display', d => d.data.photo ? 'block' : 'none');

    // Name text
    nodeEnter.append('text')
        .attr('dy', '-1.5em')
        .attr('x', d => -calculateNodeSize(d).width / 2 + 15)
        .attr('text-anchor', 'start')
        .text(d => d.data.name)
        .style('font-weight', 'bold');

    // Title text
    nodeEnter.append('text')
        .attr('dy', '0em')
        .attr('x', d => -calculateNodeSize(d).width / 2 + 15)
        .attr('text-anchor', 'start')
        .text(d => d.data.title);

    nodeEnter.append('text')
        .attr('class','email-text')
        .attr('dy', '3em')
        .attr('x', d => -calculateNodeSize(d).width / 2 + 15)
        .attr('text-anchor', 'start')
        .style('font-size', '10px')
        .text(d => d.data.email || '')
        .style('display', d => d.data.email ? 'block' : 'none');

    nodeEnter.append('text')
        .attr('class','phone-text')
        .attr('dy', '3em')
        .attr('x', d => -calculateNodeSize(d).width / 2 + 100)
        .attr('text-anchor', 'start')
        .style('font-size', '10px')
        .text(d => d.data.phone || '')
        .style('display', d => d.data.phone ? 'block' : 'none');

    nodeEnter.append('text')
        .attr('class', 'linkedin-link')
        .attr('dy', '4.5em')
        .attr('x', d => -calculateNodeSize(d).width / 2 + 15)
        .attr('text-anchor', 'start')
        .style('font-size', '10px')
        .text(d => d.data.linkedin ? 'LinkedIn' : '')
        .style('display', d => d.data.linkedin ? 'block' : 'none')
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
            .attr('height', d => calculateNodeSize(d).height)
            .attr('x', d => -calculateNodeSize(d).width / 2)
            .attr('y', d => -calculateNodeSize(d).height / 2)
            .attr('fill', d => d.data.buColor);
    
        nodeUpdate.select('.bu-flag')
            .attr('width', d => calculateNodeSize(d).buFlagWidth)
            .attr('x', d => calculateNodeSize(d).width / 2 - calculateNodeSize(d).buFlagWidth - 5)
            .attr('y', d => -calculateNodeSize(d).height / 2 + 5)
            .attr('fill', d => d.data.buColor);
    
        nodeUpdate.select('.bu-text')
            .attr('x', d => calculateNodeSize(d).width / 2 - calculateNodeSize(d).buFlagWidth / 2 - 5)
            .attr('y', d => -calculateNodeSize(d).height / 2 + 18)
            .text(d => d.data.buText);

        nodeUpdate.select('.member-photo')
            .attr('x', d => -calculateNodeSize(d).width / 2 + 15)
            .attr('y', d => -calculateNodeSize(d).height / 2 + 30)
            .attr('href', d => d.data.photo)
            .style('display', d => d.data.photo ? 'block' : 'none');
        

    nodeUpdate.selectAll('text')
        .filter(function() { return !this.classList.contains('expand-collapse') && !this.classList.contains('edit-button'); })
        .attr('x', d => -calculateNodeSize(d).width / 2 + 15);
    nodeUpdate.select('.email-text')
        .text(d => d.data.email || '')
        .style('display', d => d.data.email ? 'block' : 'none');
    nodeUpdate.select('.phone-text')
        .text(d => d.data.phone || '')
        .style('display', d => d.data.phone ? 'block' : 'none');
    nodeUpdate.select('.linkedin-link')
        .text(d => d.data.linkedin ? 'LinkedIn' : '')
        .style('display', d => d.data.linkedin ? 'block' : 'none');

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
        companyTitle.text(data.company);
        update(root);
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

    const photoInput = form.append("input")
        .attr("type", "text")
        .attr("placeholder", "Photo URL")
        .attr("value", d.data.photo || "");

    const buTextInput = form.append("input")
        .attr("type", "text")
        .attr("placeholder", "BU Text")
        .attr("value", d.data.buText);

    const buColorSelect = form.append("div")
        .attr("class", "color-picker");

    standardColors.forEach(color => {
        buColorSelect.append("div")
            .style("background-color", color)
            .style("width", "20px")
            .style("height", "20px")
            .style("display", "inline-block")
            .style("margin", "2px")
            .style("cursor", "pointer")
            .style("border", d.data.buColor === color ? "2px solid white" : "none")
            .on("click", function() {
                d.data.buColor = color;
                buColorSelect.selectAll("div").style("border", "none");
                d3.select(this).style("border", "2px solid white");
                updateNodeData();
            });
    });

    // Function to update the node data and refresh the chart
    function updateNodeData() {
        d.data.name = nameInput.property("value");
        d.data.title = titleInput.property("value");
        d.data.email = emailInput.property("value");
        d.data.phone = phoneInput.property("value");
        d.data.linkedin = linkedinInput.property("value");
        d.data.photo = photoInput.property("value");
        d.data.buText = buTextInput.property("value");
        api("PUT","/api/members/"+d.data.id,{name:d.data.name,title:d.data.title,email:d.data.email,phone:d.data.phone,linkedin:d.data.linkedin,photo:d.data.photo,bu_text:d.data.buText,bu_color:d.data.buColor,parent_id:d.parent?d.parent.data.id:null});
        update(d);
        updateJSON();
    }

    // Add event listeners for auto-updating
    nameInput.on("input", updateNodeData);
    titleInput.on("input", updateNodeData);
    emailInput.on("input", updateNodeData);
    phoneInput.on("input", updateNodeData);
    linkedinInput.on("input", updateNodeData);
    photoInput.on("input", updateNodeData);
    buTextInput.on("input", updateNodeData);

    form.append("button")
        .text("Add Child")
        .on("click", async () => {
            if (!d.data.children) d.data.children = [];
            const newChild = {name:"New Employee",title:"New Title",email:"email@example.com",phone:"(123) 456-7890",linkedin:"https://www.linkedin.com/in/newemployee",photo:"https://via.placeholder.com/80",bu_text:"NEW",bu_color:standardColors[0],parent_id:d.data.id};
            const res = await api("POST","/api/members", newChild);
            const saved = await res.json();
            newChild.id = saved.id;
            newChild.buText = newChild.bu_text;
            newChild.buColor = newChild.bu_color;
            d.data.children.push(newChild);
            if (!d.children) d.children = [];
            d.children.push(d3.hierarchy(newChild));
            update(root);
            updateJSON();
            form.remove();
        });

    form.append("button")
        .text("Delete")
        .on("click", async () => {
            await api("DELETE","/api/members/"+d.data.id);
            if (d.parent) {
                const index = d.parent.data.children.indexOf(d.data);
                if (index > -1) {
                    d.parent.data.children.splice(index, 1);
                    d.parent.children = d.parent.children.filter(child => child !== d);
                }
                update(root);
                updateJSON();
            }
            form.remove();
        });

    // Auto-close when clicking outside the form
    d3.select("body").on("click.editForm", function() {
        if (d3.event && !form.node().contains(d3.event.target)) {
            form.remove();
            d3.select("body").on("click.editForm", null);
        }
    });
}

function findNodeById(obj, id){
    if(obj.id === id) return obj;
    if(obj.children){
        for(const c of obj.children){
            const r = findNodeById(c,id);
            if(r) return r;
        }
    }
    return null;
}

function nodeMenu(event, node){
    const menu = d3.select('body').append('div')
        .attr('class','editForm')
        .style('left', event.pageX+'px')
        .style('top', event.pageY+'px');
    menu.append('div').text('Add Child').on('click',()=>{ menu.remove(); openAddForm(event,node);});
    menu.append('div').text('Edit').on('click',()=>{ menu.remove(); editNode(event,node);});
    menu.append('div').text('Delete').on('click',async()=>{ menu.remove(); await api('DELETE','/api/members/'+node.data.id); if(node.parent){ const idx=node.parent.children.indexOf(node); node.parent.children.splice(idx,1); } update(root); updateJSON();});
    d3.select('body').on('click.context',function(){ if(d3.event && !menu.node().contains(d3.event.target)){ menu.remove(); d3.select('body').on('click.context',null);} });
}

function openAddForm(event, parent) {
    const form = d3.select("body").append("div")
        .attr("class", "editForm")
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 25) + "px");

    form.append("span")
        .attr("class", "close-button")
        .html("&times;")
        .on("click", () => form.remove());

    const nameInput = form.append("input").attr("type","text").attr("placeholder","Name");
    const titleInput = form.append("input").attr("type","text").attr("placeholder","Title");
    const emailInput = form.append("input").attr("type","text").attr("placeholder","Email");
    const phoneInput = form.append("input").attr("type","text").attr("placeholder","Phone");
    const linkedinInput = form.append("input").attr("type","text").attr("placeholder","LinkedIn URL");
    const photoInput = form.append("input").attr("type","text").attr("placeholder","Photo URL");
    const buTextInput = form.append("input").attr("type","text").attr("placeholder","BU Text");

    const managerSelect = form.append("select");
    managerSelect.append("option").attr("value","" ).text("No Manager");
    d3.hierarchy(data).descendants().forEach(n=>{
        managerSelect.append("option").attr("value",n.data.id).text(n.data.name);
    });
    if(parent) managerSelect.property("value", parent.data.id);

    let selectedColor = standardColors[0];
    const colorPicker = form.append("div").attr("class","color-picker");
    standardColors.forEach(color=>{
        colorPicker.append("div")
            .style("background-color",color)
            .on("click",function(){
                selectedColor=color;
                colorPicker.selectAll("div").style("border","none");
                d3.select(this).style("border","2px solid white");
            });
    });

    form.append("button")
        .text("Add")
        .on("click", async ()=>{
            const newNode = {
                name:nameInput.property('value'),
                title:titleInput.property('value'),
                email:emailInput.property('value'),
                phone:phoneInput.property('value'),
                linkedin:linkedinInput.property('value'),
                photo:photoInput.property('value') || 'https://via.placeholder.com/80',
                bu_text:buTextInput.property('value'),
                bu_color:selectedColor,
                parent_id:managerSelect.property('value') || null
            };
            const res = await api('POST','/api/members', newNode);
            const saved = await res.json();
            newNode.id = saved.id;
            newNode.buText = newNode.bu_text;
            newNode.buColor = newNode.bu_color;
            if(newNode.parent_id){
                const parentNode = findNodeById(data, parseInt(newNode.parent_id));
                if(!parentNode.children) parentNode.children=[];
                parentNode.children.push(newNode);
            }else{
                data = newNode;
            }
            root = d3.hierarchy(data);
            update(root);
            updateJSON();
            form.remove();
        });

    d3.select("body").on("click.addForm", function(){
        if(d3.event && !form.node().contains(d3.event.target)){
            form.remove();
            d3.select("body").on("click.addForm", null);
        }
    });
}

function dragStarted(event, d){
    d3.select(this).raise();
}

function dragged(event, d){
    d.x = event.x;
    d.y = event.y;
    d3.select(this).attr('transform', `translate(${d.x},${d.y})`);
}

function dragEnded(event, d){
    const nodes = root.descendants();
    let newParent = null;
    nodes.forEach(n => {
        if(n !== d && n.y < d.y && Math.abs(n.x - d.x) < 80){
            if(!newParent || n.y > newParent.y) newParent = n;
        }
    });
    if(newParent){
        d.parent.children = d.parent.children.filter(c=>c!==d);
        if(!newParent.children) newParent.children=[];
        newParent.children.push(d);
        d.parent = newParent;
        d.data.parent_id = newParent.data.id;
        api('PUT','/api/members/'+d.data.id,{name:d.data.name,title:d.data.title,email:d.data.email,phone:d.data.phone,linkedin:d.data.linkedin,photo:d.data.photo,bu_text:d.data.buText,bu_color:d.data.buColor,parent_id:d.data.parent_id});
    }
    update(root);
    updateJSON();
}

const zoom = d3.zoom()
    .scaleExtent([0.1, 3])
    .on("zoom", (event) => {
        svg.attr("transform", event.transform);
    });

d3.select("#chart-container").call(zoom);
d3.select("#chart-container").on('contextmenu', function(event){
    if(event.target.tagName === 'svg'){ event.preventDefault(); openAddForm(event, null); }
});

window.addEventListener('resize', () => {
    width = window.innerWidth - margin.right - margin.left;
    height = window.innerHeight * 0.9 - margin.top - margin.bottom;
    d3.select("#chart-container svg")
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom);
    tree.size([width, height]);
    update(root);
});


window.initChart = function(initialData){
    data = initialData;
    companyTitle.text(data.company);
    root = d3.hierarchy(data);
    root.x0 = width / 2;
    root.y0 = 0;
    update(root);
    updateJSON();
};
window.openAddForm = openAddForm;
