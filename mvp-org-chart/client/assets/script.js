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
let activeForm = null;

function createOverlayForm() {
    if (activeForm) activeForm.remove();
    const overlay = d3.select('body').append('div')
        .attr('class', 'form-overlay');
    overlay.on('mousedown', (event) => {
        if (event.target === overlay.node()) {
            overlay.remove();
            activeForm = null;
        }
    });
    const form = overlay.append('div')
        .attr('class', 'editForm');
    activeForm = overlay;
    return form;
}

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
    .attr("y", -20)
    .attr("text-anchor","middle")
    .text("");

const tree = d3.tree().size([width, height]);

let root;
let isDragging = false;
let highlightNode = null;

function collapse(node){
    if(node.children){
        node.children.forEach(collapse);
        node._children = node.children;
        node.children = null;
    }
}
function expand(node){
    if(node._children){
        node.children = node._children;
        node.children.forEach(expand);
        node._children = null;
    }
}


let nodeId = 0;
const dragBehavior = d3.drag()
    .on('start', dragStarted)
    .on('drag', dragged)
    .on('end', dragEnded);

function diagonal(s, d) {
    return `M ${s.x} ${s.y}
        C ${s.x} ${(s.y + d.y) / 2},
          ${d.x} ${(s.y + d.y) / 2},
          ${d.x} ${d.y}`;
}

function update(source) {
    if(!root) return;
    const treeData = tree(root);

    const nodes = treeData.descendants();
    const links = treeData.descendants().slice(1);

    nodes.forEach(d => {
        d.y = d.depth * 180;
    });
    const roots = root.children ? root.children : [root];
    const center = roots.reduce((sum,n)=>sum+n.x,0)/roots.length;
    companyTitle.attr('x', center).text(data.company);

    const node = svg.selectAll('g.node')
        .data(nodes, d => d.id || (d.id = ++nodeId));

    const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .call(dragBehavior)
        .attr("transform", d => `translate(${source.x0},${source.y0})`)
        .on('click', (event, d) => {
            if (event.defaultPrevented || isDragging) return;
            if (d.children) {
                collapse(d);
            } else {
                expand(d);
            }
            update(d);
        })
        .on('contextmenu', (event, d) => {
            event.preventDefault();
            nodeMenu(event, d);
        });

        function calculateNodeSize(d) {
            const nameLength = (d.data.name || '').length;
            const titleLength = (d.data.title || '').length;
            const buFlagWidth = Math.max((d.data.buText || '').length * 10, 30);
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
        .attr('fill', 'var(--node-bg)');

    // Left color bar
    nodeEnter.append('rect')
        .attr('class', 'bu-color')
        .attr('width', 10)
        .attr('height', d => calculateNodeSize(d).height)
        .attr('x', d => -calculateNodeSize(d).width / 2)
        .attr('y', d => -calculateNodeSize(d).height / 2)
        .attr('fill', d => d.data.buColor);

    const buGroup = nodeEnter.append('g')
        .attr('class','bu-group')
        .attr('transform', d => `translate(${calculateNodeSize(d).width / 2 - calculateNodeSize(d).buFlagWidth / 2 - 5},${-calculateNodeSize(d).height / 2 + 5})`);
    buGroup.append('rect')
        .attr('class', 'bu-flag')
        .attr('height',20)
        .attr('x', d => -calculateNodeSize(d).buFlagWidth/2)
        .attr('y',0)
        .attr('width', d => calculateNodeSize(d).buFlagWidth)
        .attr('rx', 10)
        .attr('ry', 10)
        .attr('fill', d => d.data.buColor);
    buGroup.append('text')
        .attr('class', 'bu-text')
        .attr('x',0)
        .attr('y',10)
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

    const toggleGroup = nodeEnter.append('g')
        .attr('class', 'expand-collapse')
        .attr('transform', d => `translate(0,${-calculateNodeSize(d).height / 2 - 12})`)
        .style('display', d => (d.children || d._children) ? 'block' : 'none')
        .on('click', (event, d) => {
            event.stopPropagation();
            if (event.defaultPrevented || isDragging) return;
            if (d.children) {
                collapse(d);
            } else if (d._children) {
                expand(d);
            }
            update(d);
        });
    toggleGroup.append('circle')
        .attr('r', 8)
        .attr('fill', 'var(--panel-bg)')
        .attr('stroke', 'var(--text)')
        .attr('stroke-width', 1);
    toggleGroup.append('line')
        .attr('class', 'h-line')
        .attr('x1', -4)
        .attr('y1', 0)
        .attr('x2', 4)
        .attr('y2', 0)
        .attr('stroke', 'var(--text)')
        .attr('stroke-width', 2);
    toggleGroup.append('line')
        .attr('class', 'v-line')
        .attr('x1', 0)
        .attr('y1', -4)
        .attr('x2', 0)
        .attr('y2', 4)
        .attr('stroke', 'var(--text)')
        .attr('stroke-width', 2);

    const editGroup = nodeEnter.append('g')
        .attr('class', 'edit-btn')
        .attr('transform', d => `translate(${calculateNodeSize(d).width / 2 - 10},${calculateNodeSize(d).height / 2 - 15})`)
        .on('click', (event, d) => {
            event.stopPropagation();
            editNode(event, d);
        });
    editGroup.append('circle')
        .attr('r', 8)
        .attr('fill', 'var(--panel-bg)')
        .attr('stroke', 'var(--text)')
        .attr('stroke-width', 1);
    editGroup.append('path')
        .attr('d', 'M -3 2 L -1 4 L 4 -1 L 2 -3 Z')
        .attr('fill', 'var(--text)');

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
    
        nodeUpdate.select('.bu-group')
            .attr('transform', d => `translate(${calculateNodeSize(d).width / 2 - calculateNodeSize(d).buFlagWidth / 2 - 5},${-calculateNodeSize(d).height / 2 + 5})`);

        nodeUpdate.select('.bu-flag')
            .attr('width', d => calculateNodeSize(d).buFlagWidth)
            .attr('height', 20)
            .attr('x', d => -calculateNodeSize(d).buFlagWidth/2)
            .attr('y', 0)
            .attr('fill', d => d.data.buColor);

        nodeUpdate.select('.bu-text')
            .attr('x', 0)
            .attr('y', 10)
            .text(d => d.data.buText);

        nodeUpdate.select('.member-photo')
            .attr('x', d => -calculateNodeSize(d).width / 2 + 15)
            .attr('y', d => -calculateNodeSize(d).height / 2 + 30)
            .attr('href', d => d.data.photo)
            .style('display', d => d.data.photo ? 'block' : 'none');
        

    nodeUpdate.selectAll('text')
        .filter(function() { return !this.classList.contains('expand-collapse'); })
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

    nodeUpdate.select('.expand-collapse')
        .attr('transform', d => `translate(0,${-calculateNodeSize(d).height / 2 - 12})`)
        .style('display', d => (d.children || d._children) ? 'block' : 'none');

    nodeUpdate.select('.expand-collapse .v-line')
        .style('display', d => d._children ? 'block' : 'none');

    nodeUpdate.select('.expand-collapse .h-line')
        .style('display', d => (d.children || d._children) ? 'block' : 'none');

    nodeUpdate.select('.edit-btn')
        .attr('transform', d => `translate(${calculateNodeSize(d).width / 2 - 10},${calculateNodeSize(d).height / 2 - 15})`);


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
    const form = createOverlayForm();

    form.append('h3').text('Edit Member').style('margin-bottom','10px');

    form.append('span')
        .attr('class','close-button')
        .html('&times;')
        .on('click', () => {
            d3.select('.form-overlay').remove();
            activeForm = null;
        });

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
    const uploadInput = form.append("input")
        .attr("type","file")
        .attr("accept","image/*");
    let uploadedImage = null;
    uploadInput.on('change', function(){
        const file = this.files[0];
        if(file){
            const reader = new FileReader();
            reader.onload = e=>openCropper(e.target.result, data=>{ uploadedImage=data; photoInput.property('value',''); updateNodeData(); });
            reader.readAsDataURL(file);
        }
    });

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
        d.data.photo = uploadedImage || photoInput.property("value") || null;
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

    const actions = form.append('div').attr('class','actions');
    actions.append("button")
        .attr('class','btn')
        .text("Add Subordinate")
        .on("click", () => {
            d3.select('.form-overlay').remove();
            activeForm = null;
            openAddForm(event, d);
        });

    actions.append("button")
        .attr('class','btn')
        .text("Save")
        .on("click", () => {
            updateNodeData();
            d3.select('.form-overlay').remove();
            activeForm = null;
        });

    actions.append("button")
        .attr('class','btn bg-red-600')
        .text("Delete")
        .on("click", async () => {
            await api("DELETE","/api/members/"+d.data.id);
            const res = await api('GET','/api/org-chart');
            data = res.ok ? normalizeKeys(await res.json()) : {};
            root = d3.hierarchy(data);
            root.x0 = width / 2;
            root.y0 = 0;
            update(root);
            updateJSON();
            d3.select('.form-overlay').remove();
            activeForm = null;
        });

    // overlay click handled in createOverlayForm
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
        .attr('class','contextMenu')
        .style('left', event.pageX+'px')
        .style('top', event.pageY+'px');
    menu.append('div').text('Add Subordinate').on('click',()=>{ menu.remove(); openAddForm(event,node);});
    menu.append('div').text('Edit').on('click',()=>{ menu.remove(); editNode(event,node);});
    menu.append('div').text('Delete').on('click',async()=>{
        menu.remove();
        if(node.data.id){
            await api('DELETE','/api/members/'+node.data.id);
        } else {
            return;
        }
        const res = await api('GET','/api/org-chart');
        data = res.ok ? normalizeKeys(await res.json()) : {};
        root = d3.hierarchy(data);
        root.x0 = width/2;
        root.y0 = 0;
        update(root);
        updateJSON();
    });
    d3.select('body').on('click.context',function(){ if(d3.event && !menu.node().contains(d3.event.target)){ menu.remove(); d3.select('body').on('click.context',null);} });
}

function openAddForm(event, parent) {
    const form = createOverlayForm();

    form.append('h3').text('Add Member').style('margin-bottom','10px');

    form.append('span')
        .attr('class','close-button')
        .html('&times;')
        .on('click', () => {
            d3.select('.form-overlay').remove();
            activeForm = null;
        });

    const nameInput = form.append("input").attr("type","text").attr("placeholder","Name");
    const titleInput = form.append("input").attr("type","text").attr("placeholder","Title");
    const emailInput = form.append("input").attr("type","text").attr("placeholder","Email");
    const phoneInput = form.append("input").attr("type","text").attr("placeholder","Phone");
    const linkedinInput = form.append("input").attr("type","text").attr("placeholder","LinkedIn URL");
    const importBtn = form.append('button')
        .attr('class','btn')
        .text('Import from LinkedIn')
        .on('click', async ()=>{
            const url = linkedinInput.property('value');
            if(!url) return;
            const res = await api('POST','/api/linkedin',{url});
            if(res.ok){
                const info = await res.json();
                if(info.name) nameInput.property('value', info.name);
                if(info.title) titleInput.property('value', info.title);
                if(info.company) buTextInput.property('value', info.company);
                if(info.photo) {
                    photoInput.property('value', info.photo);
                    uploadedImage = null;
                }
            }
        });
    const photoInput = form.append("input").attr("type","text").attr("placeholder","Photo URL");
    const uploadInput = form.append("input").attr("type","file").attr("accept","image/*");
    let uploadedImage = null;
    uploadInput.on("change", function(){
        const file = this.files[0];
        if(file){
            const reader = new FileReader();
            reader.onload = e=>openCropper(e.target.result, data=>{ uploadedImage=data; photoInput.property('value',''); });
            reader.readAsDataURL(file);
        }
    });
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
        .attr('class','btn')
        .text("Add")
        .on("click", async ()=>{
            const newNode = {
                name:nameInput.property('value'),
                title:titleInput.property('value'),
                email:emailInput.property('value'),
                phone:phoneInput.property('value'),
                linkedin:linkedinInput.property('value'),
                photo: uploadedImage || photoInput.property('value') || null,
                bu_text:buTextInput.property('value'),
                bu_color:selectedColor,
                parent_id:managerSelect.property('value') || null
            };
            const res = await api('POST','/api/members', newNode);
            if(res.ok){
                const chartRes = await api('GET','/api/org-chart');
                data = chartRes.ok ? normalizeKeys(await chartRes.json()) : {};
                root = d3.hierarchy(data);
                root.x0 = width / 2;
                root.y0 = 0;
                update(root);
                updateJSON();
            }
            d3.select('.form-overlay').remove();
            activeForm = null;
        });

    // overlay click handled in createOverlayForm
}

function openCropper(src, cb){
    const overlay = d3.select('body').append('div').attr('id','cropOverlay').attr('class','crop-overlay');
    const box = overlay.append('div').attr('class','crop-box');
    const img = box.append('img').attr('id','cropImg').attr('src',src);
    const btns = box.append('div').style('margin-top','10px');
    let cropper = new Cropper(img.node(), {aspectRatio:1, viewMode:1});
    btns.append('button').text('Save').on('click',()=>{
        const canvas = cropper.getCroppedCanvas({width:80,height:80});
        const dataUrl = canvas.toDataURL('image/png');
        cropper.destroy();
        overlay.remove();
        cb(dataUrl);
    });
    btns.append('button').text('Cancel').on('click',()=>{ cropper.destroy(); overlay.remove(); });
}

function dragStarted(event, d){
    isDragging = false;
    d3.select(this).raise();
    d.dragStartX = d.x;
    d.dragStartY = d.y;
}

function dragged(event, d){
    isDragging = true;
    const grid = 20;
    const newX = Math.round(event.x / grid) * grid;
    const newY = Math.round(event.y / grid) * grid;
    const dx = newX - d.x;
    const dy = newY - d.y;
    d.x = newX;
    d.y = newY;
    const desc = d.descendants();
    desc.forEach(n => {
        if(n!==d){
            n.x += dx;
            n.y += dy;
        }
    });
    svg.selectAll('g.node')
        .filter(n => desc.includes(n))
        .attr('transform', n => `translate(${n.x},${n.y})`);
    svg.selectAll('path.link')
        .filter(l => desc.includes(l) || desc.includes(l.parent))
        .attr('d', l => diagonal(l, l.parent));
    const nodes = root.descendants();
    let candidate = null;
    nodes.forEach(n => {
        if(n !== d && n.y < d.y && Math.abs(n.x - d.x) < 80){
            if(!candidate || n.y > candidate.y) candidate = n;
        }
    });
    svg.selectAll('.node').classed('highlight', n => n === candidate);
    highlightNode = candidate;
}

function dragEnded(event, d){
    // use the highlighted node from the drag operation if available
    const newParent = highlightNode;
    svg.selectAll('.node').classed('highlight', false);
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
    setTimeout(()=>{ isDragging = false; },50);
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


function normalizeKeys(obj){
    if(Array.isArray(obj.children)){
        obj.children.forEach(normalizeKeys);
    }
    if(obj.bu_color){
        obj.buColor = obj.bu_color;
        delete obj.bu_color;
    }
    if(obj.bu_text){
        obj.buText = obj.bu_text;
        delete obj.bu_text;
    }
    return obj;
}

window.initChart = function(initialData){
    data = normalizeKeys(initialData);
    companyTitle.text(data.company);
    root = d3.hierarchy(data);
    root.x0 = width / 2;
    root.y0 = 0;
    update(root);
    updateJSON();
};
window.openAddForm = openAddForm;
window.updateCompany = function(name){
    data.company = name;
    if(root) root.data.company = name;
    companyTitle.text(name);
    update(root);
    updateJSON();
};

window.initTheme = function(){
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggle');
    if(btn){
        btn.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
        btn.onclick = () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            btn.textContent = next === 'dark' ? 'Light Mode' : 'Dark Mode';
        };
    }
};

window.initTheme();
