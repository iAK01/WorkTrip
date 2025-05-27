// script.js — Full consolidated itinerary renderer with accordions, generic JSON support, and Leaflet maps

;(function() {
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    const data = window.itineraryData;
    const container = document.getElementById('itinerary-container');
    if (!data || !Array.isArray(data.days) || !container) return;

    // Render all days
    data.days.forEach(day => container.appendChild(createDay(day)));

    // Initialize any maps after DOM insertion
    initMaps();

    // Persist checkbox toggles (optional)
    container.addEventListener('change', e => {
      if (e.target.matches('.stop-checkbox')) toggleStopDone(e.target);
    });
    // Persist open/close state (optional)
    container.addEventListener('toggle', e => {
      if (e.target.matches('details')) saveOpenState(e.target);
    });
  }

  // Create a <details> block for a day
  function createDay(day) {
    const completed = day.stops.filter(s => s.done).length;
    const total     = day.stops.length;
    const percent   = total ? Math.round((completed/total)*100) : 0;

    const details = document.createElement('details');
    details.className = 'day';
    if (day.open) details.open = true;

    const summary = document.createElement('summary');
    summary.className = 'day-summary';
    summary.innerHTML = `
      <div class="day-left">
        <span class="date">${day.date}</span>
        <span class="title">${day.title || ''}</span>
      </div>
      <div class="day-right">
        <span class="range">${day.start || ''}–${day.end || ''}</span>
        <span class="stops">${total} stops</span>
        <span class="progress">${percent}% done</span>
      </div>
    `;
    details.appendChild(summary);

    const body = document.createElement('div');
    body.className = 'day-body';
    day.stops.forEach((stop, idx) => body.appendChild(createStop(stop, idx+1, total)));
    details.appendChild(body);

    return details;
  }

  // Create a <details> block for a stop
  function createStop(stop, idx, total) {
    const details = document.createElement('details');
    details.className = 'stop';
    if (stop.open) details.open = true;

    // Summary
    const summary = document.createElement('summary');
    summary.className = 'stop-summary';
    summary.innerHTML = `
      <label>
        <input type="checkbox" class="stop-checkbox" data-id="${stop.id||''}" ${stop.done?'checked':''} />
        <span class="idx">${idx}/${total}</span>
        <span class="name">${stop.name || ''}</span>
      </label>
      <span class="time">${stop.scheduledTime||stop.time||stop.duration||''}</span>
    `;
    details.appendChild(summary);

    // Body
    const body = document.createElement('div');
    body.className = 'stop-body';

    // Description
    if (stop.description) {
      const p = document.createElement('p');
      p.className = 'desc';
      p.textContent = stop.description;
      body.appendChild(p);
    }

    // Known sections
    body.appendChild(createSection('Activities', stop.activities));
    body.appendChild(createSection('Dining',    stop.dining));
    body.appendChild(createSection('Details',   stop.details));

    // Generic sections for any other array or object fields
    Object.entries(stop)
      .filter(([k]) =>
        ![
          'id','name','description',
          'scheduledTime','time','duration',
          'done','open',
          'activities','dining','details'
        ].includes(k)
      )
      .forEach(([key, val]) => {
        if (Array.isArray(val)) {
          const items = val.map(item => {
            if (typeof item === 'string') return item;
            return Object.entries(item)
              .map(([k,v]) => `${humanize(k)}: ${v}`)
              .join(', ');
          });
          body.appendChild(createSection(humanize(key), items));
        }
        else if (val && typeof val === 'object') {
          const items = Object.entries(val)
            .map(([k,v]) => `${humanize(k)}: ${v}`);
          body.appendChild(createSection(humanize(key), items));
        }
      });

    // Map, if coordinates exist
    if (stop.coordinates) {
      const mapDiv = document.createElement('div');
      mapDiv.id = `map-${stop.id||idx}`;
      mapDiv.className = 'stop-map';
      mapDiv.dataset.coords = stop.coordinates;
      body.appendChild(mapDiv);
    }

    // Back-to-overview
    body.appendChild(createBackButton());
    details.appendChild(body);
    return details;
  }

  // Helper: build a collapsible <details> section
  function createSection(title, items) {
    if (!Array.isArray(items) || items.length === 0) return document.createDocumentFragment();
    const sec = document.createElement('details');
    sec.className = 'stop-section';
    const summ = document.createElement('summary');
    summ.className = 'section-title';
    summ.textContent = title;
    sec.appendChild(summ);

    const ul = document.createElement('ul');
    ul.className = 'section-list';
    items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = typeof item === 'string' ? item : (item.text || JSON.stringify(item));
      ul.appendChild(li);
    });
    sec.appendChild(ul);
    return sec;
  }

  // “Back to overview” button
  function createBackButton() {
    const btn = document.createElement('button');
    btn.className = 'back-to-day';
    btn.type = 'button';
    btn.textContent = '← Back to overview';
    btn.addEventListener('click', () => {
      const stop = btn.closest('details.stop');
      if (stop) stop.open = false;
    });
    return btn;
  }

  // Initialize Leaflet maps for all .stop-map divs
  function initMaps() {
    if (!window.L) return;
    document.querySelectorAll('.stop-map').forEach(div => {
      const [lat, lng] = div.dataset.coords.split(',').map(n => parseFloat(n.trim()));
      const map = L.map(div.id).setView([lat, lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      L.marker([lat, lng]).addTo(map);
    });
  }

  // Hooks for persistence (implement as needed)
  function toggleStopDone(cb) {
    // e.g. localStorage.setItem(cb.dataset.id, cb.checked)
  }
  function saveOpenState(det) {
    // e.g. localStorage.setItem(det.className + '-' + det.querySelector('.name')?.textContent, det.open)
  }

  // Utility: humanize camelCase or snake_case keys
  function humanize(str) {
    return str.replace(/([A-Z])/g, ' $1')
              .replace(/[_\-]/g, ' ')
              .replace(/^./, s => s.toUpperCase());
  }
})();