/**
 * PCAP Analyzer - Client-side PCAP/PCAPNG file parser and analyzer
 * Supports: PCAP, PCAPNG formats
 * Protocols: Ethernet, ARP, IPv4, IPv6, TCP, UDP, ICMP, DNS, HTTP
 * Features: Multiple files, DNS resolution via DoH, Additive filters
 */

// Global state
let pcapFiles = []; // Array of { id, name, packets, filteredPackets, pcapInfo, size }
let activeFileId = null;
let selectedPacketIndex = null;
let dnsEnabled = true; // DNS on by default
let dnsCache = {}; // IP -> hostname cache
let topLimit = 5; // Default top limit
let activeFilters = []; // Array of active filter objects { type, operator, value, display }

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const addFileInput = document.getElementById('addFileInput');
const uploadSection = document.getElementById('upload-section');
const loadingSection = document.getElementById('loading');
const analysisSection = document.getElementById('analysis-section');
const packetTableBody = document.getElementById('packetTableBody');
const filterInput = document.getElementById('filterInput');
const packetDetailsPanel = document.getElementById('packetDetailsPanel');
const fileTabs = document.getElementById('fileTabs');
const topLimitSelect = document.getElementById('topLimitSelect');
const activeFiltersContainer = document.getElementById('activeFilters');
const quickFiltersContainer = document.getElementById('quickFilters');
const fileInfoHeader = document.getElementById('fileInfoHeader');
const exportBtn = document.getElementById('exportBtn');

// Initialize
document.addEventListener('DOMContentLoaded', init);

function init() {
  setupEventListeners();
  setupThemeToggle();
  setupDnsToggle();
  setupTopLimitSelector();
}

function setupEventListeners() {
  // File drop zone
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', handleDragOver);
  dropZone.addEventListener('dragleave', handleDragLeave);
  dropZone.addEventListener('drop', handleDrop);
  fileInput.addEventListener('change', handleFileSelect);
  
  // Add file button
  addFileInput.addEventListener('change', handleAddFiles);
  
  // Buttons
  document.getElementById('resetBtn').addEventListener('click', resetAnalysis);
  document.getElementById('clearFilterBtn').addEventListener('click', clearAllFilters);
  document.getElementById('closeDetailsBtn').addEventListener('click', closeDetails);
  exportBtn.addEventListener('click', exportSummary);
  
  // Filter on Enter key
  filterInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') applyManualFilter();
  });
  
  // Auto-apply filter on input change (debounced)
  let filterTimeout;
  filterInput.addEventListener('input', () => {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(applyManualFilter, 300);
  });
}

function setupThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('pcap-analyzer-theme');
  
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-mode');
    themeToggle.textContent = '🌙';
  }
  
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('pcap-analyzer-theme', isDark ? 'dark' : 'light');
  });
}

function setupDnsToggle() {
  const dnsToggle = document.getElementById('dnsToggle');
  
  dnsToggle.addEventListener('click', () => {
    dnsEnabled = !dnsEnabled;
    dnsToggle.classList.toggle('active', dnsEnabled);
    dnsToggle.textContent = dnsEnabled ? '🌐 DNS On' : '🌐 DNS Off';
    
    if (dnsEnabled && activeFileId) {
      resolveAllDns();
    } else {
      updateTopTalkers();
    }
  });
}

function setupTopLimitSelector() {
  topLimitSelect.addEventListener('change', (e) => {
    topLimit = parseInt(e.target.value, 10);
    updateTopTalkers();
    updateProtocolDistribution();
  });
}

// DNS Resolution using Google's DNS-over-HTTPS
async function resolveDns(ip) {
  if (dnsCache[ip]) return dnsCache[ip];
  if (!ip || ip.includes(':')) return null;
  
  if (isPrivateIP(ip)) {
    dnsCache[ip] = null;
    return null;
  }
  
  try {
    const reverseName = ip.split('.').reverse().join('.') + '.in-addr.arpa';
    const response = await fetch(`https://dns.google/resolve?name=${reverseName}&type=PTR`);
    const data = await response.json();
    
    if (data.Answer && data.Answer.length > 0) {
      const hostname = data.Answer[0].data.replace(/\.$/, '');
      dnsCache[ip] = hostname;
      return hostname;
    }
  } catch (e) {
    console.warn('DNS lookup failed for', ip, e);
  }
  
  dnsCache[ip] = null;
  return null;
}

function isPrivateIP(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return true;
  
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;
  
  return false;
}

async function resolveAllDns() {
  const file = getActiveFile();
  if (!file) return;
  
  const ips = new Set();
  file.packets.forEach(p => {
    const srcIP = p.layers.ipv4?.srcIP || p.layers.ipv6?.srcIP;
    const dstIP = p.layers.ipv4?.dstIP || p.layers.ipv6?.dstIP;
    if (srcIP) ips.add(srcIP);
    if (dstIP) ips.add(dstIP);
  });
  
  const ipArray = Array.from(ips);
  for (let i = 0; i < ipArray.length; i += 5) {
    const batch = ipArray.slice(i, i + 5);
    await Promise.all(batch.map(ip => resolveDns(ip)));
  }
  
  updateTopTalkers();
}

// File handling
function handleDragOver(e) {
  e.preventDefault();
  dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files);
  if (files.length > 0) {
    processFiles(files);
  }
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  if (files.length > 0) {
    processFiles(files);
  }
}

function handleAddFiles(e) {
  const files = Array.from(e.target.files);
  if (files.length > 0) {
    processFiles(files);
  }
  e.target.value = '';
}

async function processFiles(files) {
  for (const file of files) {
    await processFile(file);
  }
}

async function processFile(file) {
  const validExtensions = ['.pcap', '.pcapng', '.cap'];
  const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!validExtensions.includes(ext)) {
    alert(`Invalid file format: ${file.name}. Please select a valid PCAP file.`);
    return;
  }
  
  if (pcapFiles.some(f => f.name === file.name && f.size === file.size)) {
    alert(`File "${file.name}" is already loaded.`);
    return;
  }
  
  uploadSection.style.display = 'none';
  loadingSection.style.display = 'flex';
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);
    
    const magicNumber = dataView.getUint32(0, true);
    
    let packets = [];
    let pcapInfo = {};
    
    if (magicNumber === 0xa1b2c3d4 || magicNumber === 0xd4c3b2a1) {
      const result = parsePcap(dataView, file.name);
      packets = result.packets;
      pcapInfo = result.pcapInfo;
    } else if (magicNumber === 0x0a0d0d0a) {
      const result = parsePcapng(dataView, file.name);
      packets = result.packets;
      pcapInfo = result.pcapInfo;
    } else {
      throw new Error('Unknown file format. Expected PCAP or PCAPNG.');
    }
    
    const fileEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      packets,
      filteredPackets: [...packets],
      pcapInfo
    };
    
    pcapFiles.push(fileEntry);
    activeFileId = fileEntry.id;
    
    loadingSection.style.display = 'none';
    analysisSection.style.display = 'flex';
    
    // Show header elements
    fileInfoHeader.style.display = 'flex';
    exportBtn.style.display = 'inline-flex';
    
    // Clear filters when loading new file
    activeFilters = [];
    
    renderFileTabs();
    updateActiveFileUI();
    
    if (dnsEnabled) {
      resolveAllDns();
    }
    
  } catch (error) {
    console.error('Error parsing file:', error);
    loadingSection.style.display = 'none';
    if (pcapFiles.length === 0) {
      uploadSection.style.display = 'flex';
    } else {
      analysisSection.style.display = 'flex';
    }
    alert('Error parsing PCAP file: ' + error.message);
  }
}

function getActiveFile() {
  return pcapFiles.find(f => f.id === activeFileId);
}

function renderFileTabs() {
  if (pcapFiles.length <= 1) {
    fileTabs.style.display = 'none';
    return;
  }
  
  fileTabs.style.display = 'flex';
  fileTabs.innerHTML = pcapFiles.map(file => `
    <div class="file-tab ${file.id === activeFileId ? 'active' : ''}" data-id="${file.id}">
      <span class="tab-name" title="${file.name}">${file.name}</span>
      <span class="tab-count">${file.packets.length}</span>
      <button class="tab-close" data-id="${file.id}" title="Close file">×</button>
    </div>
  `).join('');
  
  fileTabs.querySelectorAll('.file-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-close')) {
        switchToFile(tab.dataset.id);
      }
    });
  });
  
  fileTabs.querySelectorAll('.tab-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeFile(btn.dataset.id);
    });
  });
}

function switchToFile(fileId) {
  activeFileId = fileId;
  selectedPacketIndex = null;
  activeFilters = [];
  closeDetails();
  renderFileTabs();
  updateActiveFileUI();
  
  if (dnsEnabled) {
    resolveAllDns();
  }
}

function closeFile(fileId) {
  const index = pcapFiles.findIndex(f => f.id === fileId);
  if (index === -1) return;
  
  pcapFiles.splice(index, 1);
  
  if (pcapFiles.length === 0) {
    resetAnalysis();
    return;
  }
  
  if (activeFileId === fileId) {
    activeFileId = pcapFiles[Math.max(0, index - 1)].id;
  }
  
  renderFileTabs();
  updateActiveFileUI();
}

function updateActiveFileUI() {
  const file = getActiveFile();
  if (!file) return;
  
  updateFileInfo(file);
  updateStatistics();
  updateProtocolDistribution();
  updateTopTalkers();
  updateQuickFilters();
  renderActiveFilters();
  applyFilters();
  closeDetails();
}

// PCAP Parser
function parsePcap(dataView, fileName) {
  const packets = [];
  const littleEndian = dataView.getUint32(0, true) === 0xa1b2c3d4;
  
  const majorVersion = dataView.getUint16(4, littleEndian);
  const minorVersion = dataView.getUint16(6, littleEndian);
  const snapLen = dataView.getUint32(16, littleEndian);
  const linkType = dataView.getUint32(20, littleEndian);
  
  const pcapInfo = {
    format: 'PCAP',
    version: `${majorVersion}.${minorVersion}`,
    snapLen,
    linkType,
    fileName
  };
  
  let offset = 24;
  let packetNum = 0;
  
  while (offset < dataView.byteLength - 16) {
    try {
      const tsSec = dataView.getUint32(offset, littleEndian);
      const tsUsec = dataView.getUint32(offset + 4, littleEndian);
      const inclLen = dataView.getUint32(offset + 8, littleEndian);
      const origLen = dataView.getUint32(offset + 12, littleEndian);
      
      offset += 16;
      
      if (inclLen > snapLen || offset + inclLen > dataView.byteLength) {
        break;
      }
      
      const packetData = new Uint8Array(dataView.buffer, offset, inclLen);
      const packet = parsePacket(packetData, packetNum++, tsSec, tsUsec, inclLen, origLen, linkType);
      packets.push(packet);
      
      offset += inclLen;
    } catch (e) {
      console.warn('Error parsing packet at offset', offset, e);
      break;
    }
  }
  
  return { packets, pcapInfo };
}

function parsePcapng(dataView, fileName) {
  const packets = [];
  let offset = 0;
  let packetNum = 0;
  let interfaces = [];
  let littleEndian = true;
  
  const pcapInfo = {
    format: 'PCAPNG',
    version: '',
    fileName
  };
  
  while (offset < dataView.byteLength - 8) {
    try {
      const blockType = dataView.getUint32(offset, littleEndian);
      const blockLen = dataView.getUint32(offset + 4, littleEndian);
      
      if (blockLen < 12 || offset + blockLen > dataView.byteLength) {
        break;
      }
      
      switch (blockType) {
        case 0x0a0d0d0a:
          const byteOrder = dataView.getUint32(offset + 8, true);
          littleEndian = byteOrder === 0x1a2b3c4d;
          const majorVer = dataView.getUint16(offset + 12, littleEndian);
          const minorVer = dataView.getUint16(offset + 14, littleEndian);
          pcapInfo.version = `${majorVer}.${minorVer}`;
          break;
          
        case 0x00000001:
          const linkType = dataView.getUint16(offset + 8, littleEndian);
          const snapLen = dataView.getUint32(offset + 12, littleEndian);
          interfaces.push({ linkType, snapLen });
          break;
          
        case 0x00000006:
          const interfaceId = dataView.getUint32(offset + 8, littleEndian);
          const tsHigh = dataView.getUint32(offset + 12, littleEndian);
          const tsLow = dataView.getUint32(offset + 16, littleEndian);
          const capturedLen = dataView.getUint32(offset + 20, littleEndian);
          const origLen = dataView.getUint32(offset + 24, littleEndian);
          
          const timestamp = (BigInt(tsHigh) << 32n) | BigInt(tsLow);
          const tsSec = Number(timestamp / 1000000n);
          const tsUsec = Number(timestamp % 1000000n);
          
          if (capturedLen > 0 && offset + 28 + capturedLen <= dataView.byteLength) {
            const packetData = new Uint8Array(dataView.buffer, offset + 28, capturedLen);
            const iface = interfaces[interfaceId] || { linkType: 1 };
            const packet = parsePacket(packetData, packetNum++, tsSec, tsUsec, capturedLen, origLen, iface.linkType);
            packets.push(packet);
          }
          break;
          
        case 0x00000003:
          const spLen = blockLen - 16;
          if (spLen > 0 && offset + 12 + spLen <= dataView.byteLength) {
            const packetData = new Uint8Array(dataView.buffer, offset + 12, spLen);
            const linkType = interfaces[0]?.linkType || 1;
            const packet = parsePacket(packetData, packetNum++, 0, 0, spLen, spLen, linkType);
            packets.push(packet);
          }
          break;
      }
      
      offset += blockLen;
    } catch (e) {
      console.warn('Error parsing PCAPNG block at offset', offset, e);
      break;
    }
  }
  
  return { packets, pcapInfo };
}

function parsePacket(data, num, tsSec, tsUsec, inclLen, origLen, linkType) {
  const packet = {
    num,
    timestamp: tsSec + tsUsec / 1000000,
    length: origLen,
    capturedLength: inclLen,
    data: data,
    layers: {},
    protocol: 'Unknown',
    srcAddr: '',
    dstAddr: '',
    info: ''
  };
  
  try {
    if (linkType === 1) {
      parseEthernet(packet, data, 0);
    } else if (linkType === 101) {
      const version = (data[0] >> 4) & 0x0f;
      if (version === 4) {
        parseIPv4(packet, data, 0);
      } else if (version === 6) {
        parseIPv6(packet, data, 0);
      }
    } else if (linkType === 113) {
      parseLinuxCooked(packet, data, 0);
    }
  } catch (e) {
    console.warn('Error parsing packet', num, e);
  }
  
  return packet;
}

function parseEthernet(packet, data, offset) {
  if (data.length < offset + 14) return;
  
  const dstMac = formatMac(data, offset);
  const srcMac = formatMac(data, offset + 6);
  const etherType = (data[offset + 12] << 8) | data[offset + 13];
  
  packet.layers.ethernet = {
    srcMac,
    dstMac,
    etherType: `0x${etherType.toString(16).padStart(4, '0')}`
  };
  
  let nextOffset = offset + 14;
  let actualEtherType = etherType;
  
  if (etherType === 0x8100) {
    if (data.length < nextOffset + 4) return;
    const vlanTag = (data[nextOffset] << 8) | data[nextOffset + 1];
    actualEtherType = (data[nextOffset + 2] << 8) | data[nextOffset + 3];
    packet.layers.ethernet.vlan = vlanTag & 0x0fff;
    nextOffset += 4;
  }
  
  switch (actualEtherType) {
    case 0x0800:
      parseIPv4(packet, data, nextOffset);
      break;
    case 0x86dd:
      parseIPv6(packet, data, nextOffset);
      break;
    case 0x0806:
      parseARP(packet, data, nextOffset);
      break;
    default:
      packet.protocol = 'Ethernet';
      packet.info = `EtherType: 0x${actualEtherType.toString(16)}`;
  }
}

function parseLinuxCooked(packet, data, offset) {
  if (data.length < offset + 16) return;
  
  const packetType = (data[offset] << 8) | data[offset + 1];
  const protocol = (data[offset + 14] << 8) | data[offset + 15];
  
  packet.layers.linuxCooked = {
    packetType,
    protocol: `0x${protocol.toString(16).padStart(4, '0')}`
  };
  
  const nextOffset = offset + 16;
  
  switch (protocol) {
    case 0x0800:
      parseIPv4(packet, data, nextOffset);
      break;
    case 0x86dd:
      parseIPv6(packet, data, nextOffset);
      break;
    default:
      packet.protocol = 'Linux Cooked';
  }
}

function parseIPv4(packet, data, offset) {
  if (data.length < offset + 20) return;
  
  const versionIhl = data[offset];
  const version = (versionIhl >> 4) & 0x0f;
  const ihl = (versionIhl & 0x0f) * 4;
  const totalLength = (data[offset + 2] << 8) | data[offset + 3];
  const identification = (data[offset + 4] << 8) | data[offset + 5];
  const flagsFragment = (data[offset + 6] << 8) | data[offset + 7];
  const flags = (flagsFragment >> 13) & 0x07;
  const fragmentOffset = flagsFragment & 0x1fff;
  const ttl = data[offset + 8];
  const protocol = data[offset + 9];
  const checksum = (data[offset + 10] << 8) | data[offset + 11];
  
  const srcIP = `${data[offset + 12]}.${data[offset + 13]}.${data[offset + 14]}.${data[offset + 15]}`;
  const dstIP = `${data[offset + 16]}.${data[offset + 17]}.${data[offset + 18]}.${data[offset + 19]}`;
  
  packet.layers.ipv4 = {
    version,
    headerLength: ihl,
    totalLength,
    identification: `0x${identification.toString(16)}`,
    flags: `0x${flags.toString(16)}`,
    fragmentOffset,
    ttl,
    protocol,
    checksum: `0x${checksum.toString(16)}`,
    srcIP,
    dstIP
  };
  
  packet.srcAddr = srcIP;
  packet.dstAddr = dstIP;
  
  const nextOffset = offset + ihl;
  
  switch (protocol) {
    case 1:
      parseICMP(packet, data, nextOffset);
      break;
    case 6:
      parseTCP(packet, data, nextOffset);
      break;
    case 17:
      parseUDP(packet, data, nextOffset);
      break;
    default:
      packet.protocol = `IPv4 (${protocol})`;
      packet.info = `${srcIP} → ${dstIP}`;
  }
}

function parseIPv6(packet, data, offset) {
  if (data.length < offset + 40) return;
  
  const version = (data[offset] >> 4) & 0x0f;
  const trafficClass = ((data[offset] & 0x0f) << 4) | ((data[offset + 1] >> 4) & 0x0f);
  const flowLabel = ((data[offset + 1] & 0x0f) << 16) | (data[offset + 2] << 8) | data[offset + 3];
  const payloadLength = (data[offset + 4] << 8) | data[offset + 5];
  const nextHeader = data[offset + 6];
  const hopLimit = data[offset + 7];
  
  const srcIP = formatIPv6(data, offset + 8);
  const dstIP = formatIPv6(data, offset + 24);
  
  packet.layers.ipv6 = {
    version,
    trafficClass,
    flowLabel,
    payloadLength,
    nextHeader,
    hopLimit,
    srcIP,
    dstIP
  };
  
  packet.srcAddr = srcIP;
  packet.dstAddr = dstIP;
  
  const nextOffset = offset + 40;
  
  switch (nextHeader) {
    case 1:
    case 58:
      parseICMP(packet, data, nextOffset);
      break;
    case 6:
      parseTCP(packet, data, nextOffset);
      break;
    case 17:
      parseUDP(packet, data, nextOffset);
      break;
    default:
      packet.protocol = 'IPv6';
      packet.info = `${srcIP} → ${dstIP}`;
  }
}

function parseARP(packet, data, offset) {
  if (data.length < offset + 28) return;
  
  const hwType = (data[offset] << 8) | data[offset + 1];
  const protoType = (data[offset + 2] << 8) | data[offset + 3];
  const opcode = (data[offset + 6] << 8) | data[offset + 7];
  
  const senderMac = formatMac(data, offset + 8);
  const senderIP = `${data[offset + 14]}.${data[offset + 15]}.${data[offset + 16]}.${data[offset + 17]}`;
  const targetMac = formatMac(data, offset + 18);
  const targetIP = `${data[offset + 24]}.${data[offset + 25]}.${data[offset + 26]}.${data[offset + 27]}`;
  
  const opcodeStr = opcode === 1 ? 'Request' : opcode === 2 ? 'Reply' : `Unknown (${opcode})`;
  
  packet.layers.arp = {
    hwType,
    protoType: `0x${protoType.toString(16)}`,
    opcode: opcodeStr,
    senderMac,
    senderIP,
    targetMac,
    targetIP
  };
  
  packet.protocol = 'ARP';
  packet.srcAddr = senderIP;
  packet.dstAddr = targetIP;
  packet.info = opcode === 1 
    ? `Who has ${targetIP}? Tell ${senderIP}`
    : `${senderIP} is at ${senderMac}`;
}

function parseICMP(packet, data, offset) {
  if (data.length < offset + 8) return;
  
  const type = data[offset];
  const code = data[offset + 1];
  const checksum = (data[offset + 2] << 8) | data[offset + 3];
  
  const icmpTypes = {
    0: 'Echo Reply',
    3: 'Destination Unreachable',
    4: 'Source Quench',
    5: 'Redirect',
    8: 'Echo Request',
    11: 'Time Exceeded',
    12: 'Parameter Problem',
    13: 'Timestamp Request',
    14: 'Timestamp Reply'
  };
  
  packet.layers.icmp = {
    type,
    typeName: icmpTypes[type] || `Type ${type}`,
    code,
    checksum: `0x${checksum.toString(16)}`
  };
  
  if (type === 0 || type === 8) {
    const identifier = (data[offset + 4] << 8) | data[offset + 5];
    const sequence = (data[offset + 6] << 8) | data[offset + 7];
    packet.layers.icmp.identifier = identifier;
    packet.layers.icmp.sequence = sequence;
  }
  
  packet.protocol = 'ICMP';
  packet.info = `${icmpTypes[type] || 'Type ' + type} (code=${code})`;
}

function parseTCP(packet, data, offset) {
  if (data.length < offset + 20) return;
  
  const srcPort = (data[offset] << 8) | data[offset + 1];
  const dstPort = (data[offset + 2] << 8) | data[offset + 3];
  const seqNum = (data[offset + 4] << 24) | (data[offset + 5] << 16) | (data[offset + 6] << 8) | data[offset + 7];
  const ackNum = (data[offset + 8] << 24) | (data[offset + 9] << 16) | (data[offset + 10] << 8) | data[offset + 11];
  const dataOffset = ((data[offset + 12] >> 4) & 0x0f) * 4;
  const flags = data[offset + 13];
  const window = (data[offset + 14] << 8) | data[offset + 15];
  const checksum = (data[offset + 16] << 8) | data[offset + 17];
  const urgent = (data[offset + 18] << 8) | data[offset + 19];
  
  const flagStr = [];
  if (flags & 0x01) flagStr.push('FIN');
  if (flags & 0x02) flagStr.push('SYN');
  if (flags & 0x04) flagStr.push('RST');
  if (flags & 0x08) flagStr.push('PSH');
  if (flags & 0x10) flagStr.push('ACK');
  if (flags & 0x20) flagStr.push('URG');
  
  packet.layers.tcp = {
    srcPort,
    dstPort,
    seqNum: seqNum >>> 0,
    ackNum: ackNum >>> 0,
    dataOffset,
    flags: flagStr.join(', ') || 'None',
    window,
    checksum: `0x${checksum.toString(16)}`,
    urgent
  };
  
  const payloadOffset = offset + dataOffset;
  const payloadLen = data.length - payloadOffset;
  
  if (srcPort === 80 || dstPort === 80) {
    packet.protocol = 'HTTP';
    parseHTTP(packet, data, payloadOffset, payloadLen);
  } else if (srcPort === 443 || dstPort === 443) {
    packet.protocol = 'HTTPS';
    packet.info = `${srcPort} → ${dstPort} [${flagStr.join(',')}] Seq=${seqNum >>> 0}`;
  } else if (srcPort === 53 || dstPort === 53) {
    packet.protocol = 'DNS';
    parseDNS(packet, data, payloadOffset);
  } else {
    packet.protocol = 'TCP';
    packet.info = `${srcPort} → ${dstPort} [${flagStr.join(',')}] Seq=${seqNum >>> 0} Ack=${ackNum >>> 0} Win=${window}`;
  }
  
  packet.srcAddr = `${packet.srcAddr}:${srcPort}`;
  packet.dstAddr = `${packet.dstAddr}:${dstPort}`;
}

function parseUDP(packet, data, offset) {
  if (data.length < offset + 8) return;
  
  const srcPort = (data[offset] << 8) | data[offset + 1];
  const dstPort = (data[offset + 2] << 8) | data[offset + 3];
  const length = (data[offset + 4] << 8) | data[offset + 5];
  const checksum = (data[offset + 6] << 8) | data[offset + 7];
  
  packet.layers.udp = {
    srcPort,
    dstPort,
    length,
    checksum: `0x${checksum.toString(16)}`
  };
  
  const payloadOffset = offset + 8;
  
  if (srcPort === 53 || dstPort === 53) {
    packet.protocol = 'DNS';
    parseDNS(packet, data, payloadOffset);
  } else if (srcPort === 67 || srcPort === 68 || dstPort === 67 || dstPort === 68) {
    packet.protocol = 'DHCP';
    packet.info = `${srcPort} → ${dstPort} Len=${length}`;
  } else if (srcPort === 123 || dstPort === 123) {
    packet.protocol = 'NTP';
    packet.info = `${srcPort} → ${dstPort} Len=${length}`;
  } else {
    packet.protocol = 'UDP';
    packet.info = `${srcPort} → ${dstPort} Len=${length}`;
  }
  
  packet.srcAddr = `${packet.srcAddr}:${srcPort}`;
  packet.dstAddr = `${packet.dstAddr}:${dstPort}`;
}

function parseDNS(packet, data, offset) {
  if (data.length < offset + 12) {
    packet.info = 'DNS (truncated)';
    return;
  }
  
  const id = (data[offset] << 8) | data[offset + 1];
  const flags = (data[offset + 2] << 8) | data[offset + 3];
  const isResponse = (flags >> 15) & 1;
  const opcode = (flags >> 11) & 0x0f;
  const rcode = flags & 0x0f;
  const qdCount = (data[offset + 4] << 8) | data[offset + 5];
  const anCount = (data[offset + 6] << 8) | data[offset + 7];
  
  packet.layers.dns = {
    id: `0x${id.toString(16)}`,
    type: isResponse ? 'Response' : 'Query',
    opcode,
    rcode,
    questions: qdCount,
    answers: anCount
  };
  
  try {
    let nameOffset = offset + 12;
    let name = '';
    let labelLen = data[nameOffset];
    while (labelLen > 0 && nameOffset < data.length - 1) {
      if (name.length > 0) name += '.';
      nameOffset++;
      for (let i = 0; i < labelLen && nameOffset < data.length; i++) {
        name += String.fromCharCode(data[nameOffset++]);
      }
      labelLen = data[nameOffset] || 0;
    }
    packet.layers.dns.queryName = name;
    packet.info = isResponse 
      ? `Response: ${name} (${anCount} answers)`
      : `Query: ${name}`;
  } catch (e) {
    packet.info = isResponse ? `Response (ID: 0x${id.toString(16)})` : `Query (ID: 0x${id.toString(16)})`;
  }
}

function parseHTTP(packet, data, offset, length) {
  if (length < 4) {
    packet.info = 'HTTP (no payload)';
    return;
  }
  
  try {
    let payload = '';
    const maxLen = Math.min(length, 500);
    for (let i = 0; i < maxLen && offset + i < data.length; i++) {
      const char = data[offset + i];
      if (char >= 32 && char < 127) {
        payload += String.fromCharCode(char);
      } else if (char === 13 || char === 10) {
        payload += String.fromCharCode(char);
      }
    }
    
    const firstLine = payload.split('\r\n')[0] || payload.split('\n')[0] || '';
    
    if (firstLine.startsWith('GET') || firstLine.startsWith('POST') || 
        firstLine.startsWith('PUT') || firstLine.startsWith('DELETE') ||
        firstLine.startsWith('HEAD') || firstLine.startsWith('OPTIONS')) {
      packet.layers.http = { request: firstLine };
      packet.info = firstLine;
    } else if (firstLine.startsWith('HTTP/')) {
      packet.layers.http = { response: firstLine };
      packet.info = firstLine;
    } else {
      packet.info = `HTTP Data (${length} bytes)`;
    }
  } catch (e) {
    packet.info = `HTTP (${length} bytes)`;
  }
}

function formatMac(data, offset) {
  const bytes = [];
  for (let i = 0; i < 6; i++) {
    bytes.push(data[offset + i].toString(16).padStart(2, '0'));
  }
  return bytes.join(':');
}

function formatIPv6(data, offset) {
  const parts = [];
  for (let i = 0; i < 16; i += 2) {
    const word = (data[offset + i] << 8) | data[offset + i + 1];
    parts.push(word.toString(16));
  }
  return parts.join(':');
}

// UI Update functions
function updateFileInfo(file) {
  document.getElementById('fileName').textContent = file.name;
  const size = file.size > 1024 * 1024 
    ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
    : `${(file.size / 1024).toFixed(2)} KB`;
  document.getElementById('fileMeta').textContent = `${size} • ${file.pcapInfo.format} v${file.pcapInfo.version} • ${file.packets.length} packets`;
}

function updateStatistics() {
  const file = getActiveFile();
  if (!file) return;
  
  const totalBytes = file.packets.reduce((sum, p) => sum + p.length, 0);
  const protocols = new Set(file.packets.map(p => p.protocol));
  
  let duration = 0;
  if (file.packets.length > 1) {
    duration = file.packets[file.packets.length - 1].timestamp - file.packets[0].timestamp;
  }
  
  document.getElementById('statPackets').textContent = file.packets.length.toLocaleString();
  document.getElementById('statBytes').textContent = formatBytes(totalBytes);
  document.getElementById('statDuration').textContent = formatDuration(duration);
  document.getElementById('statProtocols').textContent = protocols.size;
}

function updateProtocolDistribution() {
  const file = getActiveFile();
  if (!file) return;
  
  const protocolCounts = {};
  file.packets.forEach(p => {
    protocolCounts[p.protocol] = (protocolCounts[p.protocol] || 0) + 1;
  });
  
  const sorted = Object.entries(protocolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topLimit);
  
  const maxCount = sorted[0]?.[1] || 1;
  const container = document.getElementById('protocolBars');
  
  container.innerHTML = sorted.map(([proto, count]) => {
    const percentage = (count / maxCount) * 100;
    const isActive = activeFilters.some(f => f.type === 'protocol' && f.value.toLowerCase() === proto.toLowerCase());
    
    return `
      <div class="talker-item${isActive ? ' active' : ''}" data-filter-type="protocol" data-filter-value="${proto}" title="Click to add/remove filter">
        <div class="talker-item-bar" style="width: ${percentage}%"></div>
        <span class="protocol">${proto}</span>
        <span class="count">${count.toLocaleString()}</span>
      </div>
    `;
  }).join('') || '<div class="talker-item" style="cursor: default;">No data</div>';
  
  container.querySelectorAll('.talker-item[data-filter-type]').forEach(item => {
    item.addEventListener('click', () => {
      const proto = item.dataset.filterValue;
      toggleFilter('protocol', '==', proto, proto);
    });
  });
}

function updateQuickFilters() {
  const file = getActiveFile();
  if (!file) return;
  
  // Get all unique protocols
  const protocols = new Set(file.packets.map(p => p.protocol));
  const sortedProtocols = Array.from(protocols).sort();
  
  quickFiltersContainer.innerHTML = sortedProtocols.map(proto => {
    const isActive = activeFilters.some(f => f.type === 'protocol' && f.value.toLowerCase() === proto.toLowerCase());
    return `<button class="quick-filter${isActive ? ' active' : ''}" data-protocol="${proto}">${proto}</button>`;
  }).join('');
  
  quickFiltersContainer.querySelectorAll('.quick-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      const proto = btn.dataset.protocol;
      toggleFilter('protocol', '==', proto, proto);
    });
  });
}

function updateTopTalkers() {
  const file = getActiveFile();
  if (!file) return;
  
  const srcIpCounts = {};
  const dstIpCounts = {};
  const srcPortCounts = {};
  const dstPortCounts = {};
  const conversations = {};
  
  file.packets.forEach(p => {
    const srcIP = p.layers.ipv4?.srcIP || p.layers.ipv6?.srcIP || '';
    const dstIP = p.layers.ipv4?.dstIP || p.layers.ipv6?.dstIP || '';
    
    if (srcIP) srcIpCounts[srcIP] = (srcIpCounts[srcIP] || 0) + 1;
    if (dstIP) dstIpCounts[dstIP] = (dstIpCounts[dstIP] || 0) + 1;
    
    const srcPort = p.layers.tcp?.srcPort || p.layers.udp?.srcPort;
    const dstPort = p.layers.tcp?.dstPort || p.layers.udp?.dstPort;
    
    if (srcPort) srcPortCounts[srcPort] = (srcPortCounts[srcPort] || 0) + 1;
    if (dstPort) dstPortCounts[dstPort] = (dstPortCounts[dstPort] || 0) + 1;
    
    if (srcIP && dstIP) {
      const key = [srcIP, dstIP].sort().join(' ↔ ');
      conversations[key] = (conversations[key] || 0) + 1;
    }
  });
  
  renderTopList('topSources', srcIpCounts, topLimit, 'ip.src');
  renderTopList('topDests', dstIpCounts, topLimit, 'ip.dst');
  renderTopList('topConversations', conversations, topLimit, 'conversation');
  renderTopList('topSrcPorts', srcPortCounts, topLimit, 'port.src');
  renderTopList('topDstPorts', dstPortCounts, topLimit, 'port.dst');
}

function renderTopList(containerId, counts, limit, filterType) {
  const container = document.getElementById(containerId);
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit);
  const maxCount = sorted[0]?.[1] || 1;
  
  container.innerHTML = sorted.map(([key, count]) => {
    const percentage = (count / maxCount) * 100;
    const isPort = filterType.startsWith('port');
    const isConversation = filterType === 'conversation';
    const isIp = filterType.startsWith('ip');
    const hostname = isIp && dnsEnabled ? dnsCache[key] : null;
    
    // Check if this item is in active filters
    const isActive = isFilterActive(filterType, key);
    
    // Determine the CSS class for the value
    let valueClass = 'ip';
    if (isPort) valueClass = 'port';
    if (isConversation) valueClass = 'conversation';
    
    return `
      <div class="talker-item${isActive ? ' active' : ''}" data-filter-type="${filterType}" data-filter-value="${escapeHtml(key)}" title="Click to add/remove filter">
        <div class="talker-item-bar" style="width: ${percentage}%"></div>
        <span class="${valueClass}" title="${key}">${key}</span>
        ${hostname ? `<span class="hostname" title="${hostname}">${hostname}</span>` : ''}
        <span class="count">${count.toLocaleString()}</span>
      </div>
    `;
  }).join('') || '<div class="talker-item" style="cursor: default;">No data</div>';
  
  container.querySelectorAll('.talker-item[data-filter-type]').forEach(item => {
    item.addEventListener('click', () => {
      const type = item.dataset.filterType;
      const value = item.dataset.filterValue;
      toggleTalkerFilter(type, value);
    });
  });
}

function isFilterActive(filterType, value) {
  return activeFilters.some(f => {
    if (filterType === 'conversation') {
      // Convert display format " ↔ " to storage format "|" for comparison
      const normalizedValue = value.replace(' ↔ ', '|');
      return f.type === 'conversation' && f.value === normalizedValue;
    }
    return f.type === filterType && f.value === value;
  });
}

// Filter Management
function toggleFilter(type, operator, value, display) {
  const existingIndex = activeFilters.findIndex(f => 
    f.type === type && f.value.toLowerCase() === value.toLowerCase()
  );
  
  if (existingIndex >= 0) {
    // Remove filter
    activeFilters.splice(existingIndex, 1);
  } else {
    // Add filter with baseDisplay for negation toggle
    const baseDisplay = display || value;
    activeFilters.push({ 
      type, 
      operator, 
      value, 
      display: baseDisplay,
      baseDisplay: baseDisplay 
    });
  }
  
  renderActiveFilters();
  applyFilters();
  updateProtocolDistribution();
  updateQuickFilters();
  updateTopTalkers();
}

function toggleTalkerFilter(filterType, value) {
  let type, display, filterValue;
  
  switch (filterType) {
    case 'ip.src':
      type = 'ip.src';
      display = `src: ${value}`;
      filterValue = value;
      break;
    case 'ip.dst':
      type = 'ip.dst';
      display = `dst: ${value}`;
      filterValue = value;
      break;
    case 'port.src':
      type = 'port.src';
      display = `src port: ${value}`;
      filterValue = value;
      break;
    case 'port.dst':
      type = 'port.dst';
      display = `dst port: ${value}`;
      filterValue = value;
      break;
    case 'conversation':
      type = 'conversation';
      display = value;
      // Convert " ↔ " to "|" for internal storage
      filterValue = value.replace(' ↔ ', '|');
      break;
    default:
      return;
  }
  
  toggleFilter(type, '==', filterValue, display);
}

function removeFilter(index) {
  activeFilters.splice(index, 1);
  renderActiveFilters();
  applyFilters();
  updateProtocolDistribution();
  updateQuickFilters();
  updateTopTalkers();
}

function renderActiveFilters() {
  activeFiltersContainer.innerHTML = activeFilters.map((filter, index) => {
    const isNegated = filter.operator === '!=';
    const displayText = isNegated ? `NOT ${filter.baseDisplay || filter.display.replace(/^NOT\s+/, '')}` : (filter.baseDisplay || filter.display);
    return `
      <div class="active-filter-tag${isNegated ? ' negated' : ''}" data-index="${index}" title="Click to negate">
        <span class="filter-text">${displayText}</span>
        <span class="remove" title="Remove filter">×</span>
      </div>
    `;
  }).join('');
  
  // Click on tag (except ×) toggles negation
  activeFiltersContainer.querySelectorAll('.active-filter-tag').forEach(tag => {
    tag.addEventListener('click', (e) => {
      // If clicked on the remove button, don't toggle negation
      if (e.target.classList.contains('remove')) return;
      
      const index = parseInt(tag.dataset.index, 10);
      toggleFilterNegation(index);
    });
  });
  
  // Click on × removes the filter
  activeFiltersContainer.querySelectorAll('.remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.closest('.active-filter-tag').dataset.index, 10);
      removeFilter(index);
    });
  });
  
  // Update filter input to show current filter string
  filterInput.value = activeFilters.map(f => {
    if (f.type === 'conversation') {
      return `conversation${f.operator}${f.value}`;
    }
    return `${f.type}${f.operator}${f.value}`;
  }).join(' && ');
}

function toggleFilterNegation(index) {
  const filter = activeFilters[index];
  if (!filter) return;
  
  // Toggle between == and !=
  filter.operator = filter.operator === '==' ? '!=' : '==';
  
  // Store base display without NOT prefix
  if (!filter.baseDisplay) {
    filter.baseDisplay = filter.display.replace(/^NOT\s+/, '');
  }
  
  // Update display
  filter.display = filter.operator === '!=' ? `NOT ${filter.baseDisplay}` : filter.baseDisplay;
  
  renderActiveFilters();
  applyFilters();
  updateProtocolDistribution();
  updateQuickFilters();
  updateTopTalkers();
}

function applyManualFilter() {
  const filterStr = filterInput.value.trim();
  
  if (!filterStr) {
    activeFilters = [];
  } else {
    // Parse the filter string
    const newFilters = parseFilterString(filterStr);
    if (newFilters.length > 0) {
      activeFilters = newFilters;
    }
  }
  
  renderActiveFilters();
  applyFilters();
  updateProtocolDistribution();
  updateQuickFilters();
  updateTopTalkers();
}

function parseFilterString(filterStr) {
  const filters = [];
  
  // Split by && or and
  const parts = filterStr.split(/\s*(?:&&|and)\s*/i);
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    // Match pattern: type operator value
    // Supports == and !=
    const match = trimmed.match(/^([a-z.]+)\s*(==|!=)\s*(.+)$/i);
    if (match) {
      const [, type, operator, value] = match;
      let baseDisplay = value;
      
      if (type === 'protocol') {
        baseDisplay = value.toUpperCase();
      } else if (type === 'ip.src') {
        baseDisplay = `src: ${value}`;
      } else if (type === 'ip.dst') {
        baseDisplay = `dst: ${value}`;
      } else if (type === 'port.src') {
        baseDisplay = `src port: ${value}`;
      } else if (type === 'port.dst') {
        baseDisplay = `dst port: ${value}`;
      } else if (type === 'conversation') {
        baseDisplay = value.replace('|', ' ↔ ');
      }
      
      const display = operator === '!=' ? `NOT ${baseDisplay}` : baseDisplay;
      
      filters.push({ type: type.toLowerCase(), operator, value, display, baseDisplay });
    }
  }
  
  return filters;
}

function applyFilters() {
  const file = getActiveFile();
  if (!file) return;
  
  if (activeFilters.length === 0) {
    file.filteredPackets = [...file.packets];
  } else {
    file.filteredPackets = file.packets.filter(packet => {
      // All filters must match (AND logic)
      return activeFilters.every(filter => matchFilter(packet, filter));
    });
  }
  
  renderPacketTable();
  closeDetails();
}

function matchFilter(packet, filter) {
  const { type, operator, value } = filter;
  const isNot = operator === '!=';
  let matches = false;
  
  switch (type) {
    case 'protocol':
      matches = packet.protocol.toLowerCase() === value.toLowerCase();
      break;
      
    case 'ip.src':
      const srcIP = packet.layers.ipv4?.srcIP || packet.layers.ipv6?.srcIP || '';
      matches = srcIP.toLowerCase() === value.toLowerCase() || srcIP.includes(value);
      break;
      
    case 'ip.dst':
      const dstIP = packet.layers.ipv4?.dstIP || packet.layers.ipv6?.dstIP || '';
      matches = dstIP.toLowerCase() === value.toLowerCase() || dstIP.includes(value);
      break;
      
    case 'port.src':
      const srcPort = packet.layers.tcp?.srcPort || packet.layers.udp?.srcPort;
      matches = srcPort?.toString() === value;
      break;
      
    case 'port.dst':
      const dstPort = packet.layers.tcp?.dstPort || packet.layers.udp?.dstPort;
      matches = dstPort?.toString() === value;
      break;
      
    case 'tcp.port':
    case 'udp.port':
      const pSrcPort = packet.layers.tcp?.srcPort || packet.layers.udp?.srcPort;
      const pDstPort = packet.layers.tcp?.dstPort || packet.layers.udp?.dstPort;
      matches = pSrcPort?.toString() === value || pDstPort?.toString() === value;
      break;
      
    case 'conversation':
      const ips = value.split('|');
      if (ips.length === 2) {
        const cSrcIP = packet.layers.ipv4?.srcIP || packet.layers.ipv6?.srcIP || '';
        const cDstIP = packet.layers.ipv4?.dstIP || packet.layers.ipv6?.dstIP || '';
        matches = (cSrcIP === ips[0] && cDstIP === ips[1]) || (cSrcIP === ips[1] && cDstIP === ips[0]);
      }
      break;
      
    default:
      // Generic text search
      matches = packet.protocol.toLowerCase().includes(value.toLowerCase()) ||
               packet.srcAddr.toLowerCase().includes(value.toLowerCase()) ||
               packet.dstAddr.toLowerCase().includes(value.toLowerCase()) ||
               packet.info.toLowerCase().includes(value.toLowerCase());
  }
  
  return isNot ? !matches : matches;
}

function clearAllFilters() {
  activeFilters = [];
  filterInput.value = '';
  renderActiveFilters();
  applyFilters();
  updateProtocolDistribution();
  updateQuickFilters();
  updateTopTalkers();
}

function renderPacketTable() {
  const file = getActiveFile();
  if (!file) return;
  
  const fragment = document.createDocumentFragment();
  const baseTime = file.filteredPackets[0]?.timestamp || 0;
  
  file.filteredPackets.forEach((packet, index) => {
    const row = document.createElement('tr');
    row.dataset.index = index;
    row.addEventListener('click', () => selectPacket(index));
    
    const relTime = (packet.timestamp - baseTime).toFixed(6);
    const protoClass = `protocol-${packet.protocol.toLowerCase()}`;
    
    const srcDisplay = packet.srcAddr.split(':')[0] || packet.srcAddr;
    const dstDisplay = packet.dstAddr.split(':')[0] || packet.dstAddr;
    
    row.innerHTML = `
      <td class="col-no">${packet.num + 1}</td>
      <td class="col-time">${relTime}</td>
      <td class="col-src" title="${packet.srcAddr}">${srcDisplay}</td>
      <td class="col-dst" title="${packet.dstAddr}">${dstDisplay}</td>
      <td class="col-proto"><span class="protocol-badge ${protoClass}">${packet.protocol}</span></td>
      <td class="col-len">${packet.length}</td>
      <td class="col-info" title="${packet.info}">${packet.info}</td>
    `;
    
    fragment.appendChild(row);
  });
  
  packetTableBody.innerHTML = '';
  packetTableBody.appendChild(fragment);
  
  document.getElementById('displayedCount').textContent = file.filteredPackets.length;
  document.getElementById('totalCount').textContent = file.packets.length;
}

function selectPacket(index) {
  const file = getActiveFile();
  if (!file) return;
  
  document.querySelectorAll('.packet-table tbody tr').forEach(tr => tr.classList.remove('selected'));
  
  const row = document.querySelector(`.packet-table tbody tr[data-index="${index}"]`);
  if (row) row.classList.add('selected');
  
  selectedPacketIndex = index;
  const packet = file.filteredPackets[index];
  
  document.getElementById('detailsPlaceholder').style.display = 'none';
  document.getElementById('detailsActive').style.display = 'flex';
  document.getElementById('detailsPacketNum').textContent = `#${packet.num + 1}`;
  
  renderPacketDetails(packet);
}

function renderPacketDetails(packet) {
  const layerTree = document.getElementById('layerTree');
  layerTree.innerHTML = '';
  
  const layerOrder = ['ethernet', 'linuxCooked', 'arp', 'ipv4', 'ipv6', 'icmp', 'tcp', 'udp', 'dns', 'http'];
  
  layerOrder.forEach(layerName => {
    if (packet.layers[layerName]) {
      const section = createLayerSection(layerName, packet.layers[layerName]);
      layerTree.appendChild(section);
    }
  });
  
  renderHexView(packet.data);
}

function createLayerSection(name, data) {
  const layerNames = {
    ethernet: 'Ethernet II',
    linuxCooked: 'Linux Cooked Capture',
    arp: 'Address Resolution Protocol',
    ipv4: 'Internet Protocol v4',
    ipv6: 'Internet Protocol v6',
    icmp: 'Internet Control Message Protocol',
    tcp: 'Transmission Control Protocol',
    udp: 'User Datagram Protocol',
    dns: 'Domain Name System',
    http: 'Hypertext Transfer Protocol'
  };
  
  const section = document.createElement('div');
  section.className = 'layer-section expanded';
  
  const header = document.createElement('div');
  header.className = 'layer-header';
  header.innerHTML = `<span class="layer-icon">▶</span> ${layerNames[name] || name}`;
  header.addEventListener('click', () => section.classList.toggle('expanded'));
  
  const content = document.createElement('div');
  content.className = 'layer-content';
  
  Object.entries(data).forEach(([key, value]) => {
    const field = document.createElement('div');
    field.className = 'layer-field';
    field.innerHTML = `
      <span class="field-name">${formatFieldName(key)}</span>
      <span class="field-value">${value}</span>
    `;
    content.appendChild(field);
  });
  
  section.appendChild(header);
  section.appendChild(content);
  
  return section;
}

function formatFieldName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function renderHexView(data) {
  const hexView = document.getElementById('hexView');
  hexView.innerHTML = '';
  
  for (let i = 0; i < data.length; i += 16) {
    const line = document.createElement('div');
    line.className = 'hex-line';
    
    const offset = i.toString(16).padStart(8, '0');
    const bytes = [];
    let ascii = '';
    
    for (let j = 0; j < 16; j++) {
      if (i + j < data.length) {
        const byte = data[i + j];
        bytes.push(`<span>${byte.toString(16).padStart(2, '0')}</span>`);
        ascii += (byte >= 32 && byte < 127) ? String.fromCharCode(byte) : '.';
      } else {
        bytes.push('<span>  </span>');
        ascii += ' ';
      }
    }
    
    line.innerHTML = `
      <span class="hex-offset">${offset}</span>
      <span class="hex-bytes">${bytes.join('')}</span>
      <span class="hex-ascii">${escapeHtml(ascii)}</span>
    `;
    
    hexView.appendChild(line);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function closeDetails() {
  document.getElementById('detailsPlaceholder').style.display = 'flex';
  document.getElementById('detailsActive').style.display = 'none';
  selectedPacketIndex = null;
  document.querySelectorAll('.packet-table tbody tr').forEach(tr => tr.classList.remove('selected'));
}

function exportSummary() {
  const file = getActiveFile();
  if (!file) return;
  
  const protocolCounts = {};
  file.packets.forEach(p => {
    protocolCounts[p.protocol] = (protocolCounts[p.protocol] || 0) + 1;
  });
  
  const totalBytes = file.packets.reduce((sum, p) => sum + p.length, 0);
  let duration = 0;
  if (file.packets.length > 1) {
    duration = file.packets[file.packets.length - 1].timestamp - file.packets[0].timestamp;
  }
  
  const summary = {
    file: file.pcapInfo.fileName,
    format: file.pcapInfo.format,
    version: file.pcapInfo.version,
    statistics: {
      totalPackets: file.packets.length,
      totalBytes,
      duration: formatDuration(duration),
      avgPacketSize: Math.round(totalBytes / file.packets.length)
    },
    protocolDistribution: protocolCounts,
    activeFilters: activeFilters.map(f => `${f.type}${f.operator}${f.value}`),
    packets: file.filteredPackets.map(p => ({
      number: p.num + 1,
      timestamp: p.timestamp,
      source: p.srcAddr,
      destination: p.dstAddr,
      protocol: p.protocol,
      length: p.length,
      info: p.info
    }))
  };
  
  const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${file.pcapInfo.fileName.replace(/\.[^.]+$/, '')}_analysis.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function resetAnalysis() {
  pcapFiles = [];
  activeFileId = null;
  selectedPacketIndex = null;
  dnsCache = {};
  activeFilters = [];
  
  analysisSection.style.display = 'none';
  uploadSection.style.display = 'flex';
  fileTabs.style.display = 'none';
  fileTabs.innerHTML = '';
  packetTableBody.innerHTML = '';
  filterInput.value = '';
  fileInput.value = '';
  activeFiltersContainer.innerHTML = '';
  quickFiltersContainer.innerHTML = '';
  
  // Hide header elements
  fileInfoHeader.style.display = 'none';
  exportBtn.style.display = 'none';
  
  closeDetails();
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
  if (seconds < 1) return `${(seconds * 1000).toFixed(2)} ms`;
  if (seconds < 60) return `${seconds.toFixed(2)} s`;
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2);
  return `${mins}m ${secs}s`;
}
