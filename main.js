/* ====================================
   CRM ACTIVITY / INFORMATION DASHBOARD
   JavaScript
   ==================================== */

const STORAGE_KEYS = { tasks: 'crm_tasks', timeline: 'crm_timeline', taskCount: 'crm_taskCount' };

const appState = {
  currentStep: 1,
  currentTab: 'activity',
  sortColumn: null,
  sortDirection: 'asc',
  taskCount: 4
};

document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  initializeEventListeners();
  initializeDateInputs();
});

// ===== TAB NAVIGATION =====
function initializeEventListeners() {
  // Tab buttons
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', handleTabClick);
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleTabClick({ currentTarget: button });
      }
    });
  });

  // Step selection
  document.querySelectorAll('.step').forEach(step => {
    step.addEventListener('click', handleStepClick);
    step.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleStepClick({ currentTarget: step });
      }
    });
  });

  // Task form submission
  document.getElementById('task-form').addEventListener('submit', handleFormSubmit);

  // Task table sorting
  document.querySelectorAll('.task-table th.sortable').forEach(th => {
    th.addEventListener('click', handleTableSort);
  });

  // Table subject links
  document.querySelectorAll('.table-link').forEach(link => {
    link.addEventListener('click', handleSubjectClick);
  });

  // Timeline expand buttons
  document.querySelectorAll('.timeline-expand').forEach(button => {
    button.addEventListener('click', handleTimelineExpand);
  });

  // Modal close button
  const modalClose = document.querySelector('.modal-close');
  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }

  // Modal backdrop click
  const modal = document.getElementById('detail-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('modal-backdrop')) {
        closeModal();
      }
    });
  }

  // Keyboard close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('detail-modal');
      if (modal && !modal.hidden) {
        closeModal();
      }
    }
  });

  // View More link
  const viewMoreLink = document.querySelector('.view-more-link');
  if (viewMoreLink) {
    viewMoreLink.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Would show more tasks in a real application.');
    });
  }

  // Task tab switching
  document.querySelectorAll('.task-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.task-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
}

// ===== TAB HANDLING =====
function handleTabClick(e) {
  const button = e.currentTarget;
  const tabName = button.dataset.tab;

  // Update button states
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
  });

  button.classList.add('active');
  button.setAttribute('aria-selected', 'true');

  // Update panel visibility
  document.querySelectorAll('.content-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  const activePanel = document.getElementById(`${tabName}-panel`);
  if (activePanel) {
    activePanel.classList.add('active');
  }

  appState.currentTab = tabName;
}

// ===== STEP HANDLING =====
function handleStepClick(e) {
  const step = e.currentTarget;
  const stepNumber = parseInt(step.dataset.step);

  // Update step states
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  step.classList.add('active');

  appState.currentStep = stepNumber;
}

// ===== FORM HANDLING =====
function handleFormSubmit(e) {
  e.preventDefault();

  // Get form values
  const taskType = document.getElementById('task-type-select').value;
  const assignedTo = document.getElementById('assigned-to-select').value;
  const subject = document.getElementById('subject-input').value;
  const details = document.getElementById('details-textarea').value;
  const startDate = document.getElementById('start-date-input').value;
  const endDate = document.getElementById('end-date-input').value;

  if (!taskType) {
    alert('Please select a Task Type');
    return;
  }

  if (!assignedTo) {
    alert('Please select who to assign this to');
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  if (startDate && endDate && endDate < startDate) {
    alert('End Date must be on or after Start Date.');
    return;
  }
  if (startDate && endDate && startDate < today) {
    alert('Start Date cannot be in the past.');
    return;
  }
  const remindOn = document.getElementById('remind-on-input').value;
  if (remindOn && remindOn < today) {
    alert('Remind On date cannot be in the past.');
    return;
  }

  const rowId = appState.taskCount + 1;
  appState.taskCount++;
  const typeLabel = taskType.charAt(0).toUpperCase() + taskType.slice(1);
  const assignedName = getAssigneeName(assignedTo);
  const dueDateStr = endDate ? formatDate(endDate) : 'No date';

  const newRow = document.createElement('tr');
  newRow.dataset.rowId = rowId;
  newRow.innerHTML = `
    <td>${rowId}</td>
    <td><a href="#" class="table-link" data-subject-id="${rowId}">${subject || 'New Task'}</a></td>
    <td>${typeLabel}</td>
    <td>${assignedName}</td>
    <td>${dueDateStr}</td>
    <td><span class="status-badge pending">Pending</span></td>
  `;
  newRow.querySelector('.table-link').addEventListener('click', handleSubjectClick);

  const tbody = document.getElementById('task-table-body');
  tbody.insertBefore(newRow, tbody.firstChild);

  addTimelineEntry(subject || 'New Task', details, assignedName);

  const taskRecord = {
    rowId,
    subject: subject || 'New Task',
    type: typeLabel,
    assignedTo,
    assignedName,
    dueDate: endDate || '',
    dueDateStr,
    status: 'pending'
  };
  const timelineRecord = {
    subject: subject || 'New Task',
    details: details || '',
    assignee: assignedName,
    createdAt: new Date().toISOString()
  };
  saveTaskToStorage(taskRecord);
  saveTimelineEntryToStorage(timelineRecord);

  document.getElementById('task-form').reset();
  showFormSuccess();
}

// ===== TABLE SORTING =====
function handleTableSort(e) {
  const th = e.currentTarget;
  const column = th.dataset.column;

  // Update sort direction
  if (appState.sortColumn === column) {
    appState.sortDirection = appState.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    appState.sortDirection = 'asc';
    if (appState.sortColumn) {
      document.querySelector(`th[data-column="${appState.sortColumn}"]`).setAttribute('aria-sort', 'none');
    }
  }

  appState.sortColumn = column;

  // Update aria-sort attribute
  document.querySelectorAll('.task-table th.sortable').forEach(t => {
    t.setAttribute('aria-sort', 'none');
  });
  th.setAttribute('aria-sort', appState.sortDirection === 'asc' ? 'ascending' : 'descending');

  // Sort table
  sortTable(column, appState.sortDirection);
}

function sortTable(column, direction) {
  const tbody = document.getElementById('task-table-body');
  const rows = Array.from(tbody.querySelectorAll('tr'));

  rows.sort((a, b) => {
    const columnIndex = {
      'id': 0,
      'subject': 1,
      'type': 2,
      'assigned': 3,
      'due': 4,
      'status': 5
    }[column];

    const aValue = a.cells[columnIndex].textContent.trim();
    const bValue = b.cells[columnIndex].textContent.trim();

    // Numeric sort for ID and numeric values
    if (column === 'id') {
      return direction === 'asc' ? parseInt(aValue) - parseInt(bValue) : parseInt(bValue) - parseInt(aValue);
    }

    // String sort
    if (direction === 'asc') {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  rows.forEach(row => tbody.appendChild(row));
}

// ===== SUBJECT CLICK HANDLER =====
function handleSubjectClick(e) {
  e.preventDefault();

  const subjectId = e.currentTarget.dataset.subjectId;
  const subject = e.currentTarget.textContent;

  // Populate modal
  document.getElementById('modal-title').textContent = subject;
  document.getElementById('modal-body').innerHTML = `
    <div style="margin-bottom: 16px;">
      <h4 style="margin-bottom: 8px;">Task Details</h4>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Status:</strong> Pending</p>
      <p><strong>Created:</strong> February 14, 2026</p>
    </div>
    <div style="margin-bottom: 16px;">
      <h4 style="margin-bottom: 8px;">Description</h4>
      <p>This is a detailed view of the selected task. In a real application, this would show complete task information, history, comments, and related records.</p>
    </div>
    <div>
      <button class="btn btn-outline" onclick="closeModal()">Close</button>
    </div>
  `;

  // Show modal
  const modal = document.getElementById('detail-modal');
  modal.removeAttribute('hidden');

  // Focus on close button
  setTimeout(() => {
    const closeBtn = document.querySelector('.modal-close');
    closeBtn.focus();
  }, 100);
}

// ===== TIMELINE EXPAND =====
function handleTimelineExpand(e) {
  e.preventDefault();

  const button = e.currentTarget;
  const content = button.closest('.timeline-content');
  const details = content.querySelector('.timeline-details');
  const isExpanded = details.hasAttribute('hidden');

  if (isExpanded) {
    details.removeAttribute('hidden');
    button.setAttribute('aria-expanded', 'true');
  } else {
    details.setAttribute('hidden', '');
    button.setAttribute('aria-expanded', 'false');
  }
}

// ===== ADD TIMELINE ENTRY =====
function addTimelineEntry(subject, details, assignee) {
  const timeline = document.querySelector('.activity-timeline');

  const newEntry = document.createElement('div');
  newEntry.className = 'timeline-item';
  newEntry.innerHTML = `
    <div class="timeline-icon success">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="timeline-content">
      <div class="timeline-header">
        <h4>${subject || 'Task created'}</h4>
        
      </div>
      <p class="timeline-description">You added a To DO task with <span class="contact-name">${assignee}</span></p>
      <p class="timeline-time">${getCurrentDateTime()}</p>
      <div class="timeline-details" hidden>
        <p>${details || 'No additional details provided.'}</p>
      </div>
      <button class="timeline-expand" aria-expanded="false" aria-label="Expand activity details">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M5 9l7 7 7-7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
          </svg>
        </button>
    </div>
  `;

  // Add animation
  newEntry.style.opacity = '0';
  newEntry.style.transform = 'translateY(-10px)';
  newEntry.style.transition = 'all 300ms ease-out';

  timeline.insertBefore(newEntry, timeline.firstChild);

  const nextSibling = newEntry.nextElementSibling;
  if (nextSibling) {
    const divider = document.createElement('div');
    divider.className = 'timeline-divider';
    timeline.insertBefore(divider, nextSibling);
  }

  setTimeout(() => {
    newEntry.style.opacity = '1';
    newEntry.style.transform = 'translateY(0)';
  }, 10);

  newEntry.querySelector('.timeline-expand').addEventListener('click', handleTimelineExpand);
}

// ===== MODAL FUNCTIONS =====
function closeModal() {
  const modal = document.getElementById('detail-modal');
  modal.setAttribute('hidden', '');
}

// ===== DATE INPUT HANDLING =====
function initializeDateInputs() {
  const today = new Date().toISOString().split('T')[0];
  const startInput = document.getElementById('start-date-input');
  const endInput = document.getElementById('end-date-input');
  const remindInput = document.getElementById('remind-on-input');

  [startInput, endInput, remindInput].forEach(input => {
    if (input) input.setAttribute('min', today);
  });

  startInput.addEventListener('change', function () {
    const val = this.value;
    if (endInput && val) endInput.setAttribute('min', val);
    else if (endInput) endInput.setAttribute('min', today);
  });
  endInput.addEventListener('change', function () {
    const val = this.value;
    if (startInput && val) startInput.setAttribute('max', val);
    else if (startInput) startInput.removeAttribute('max');
  });

  document.querySelectorAll('.date-input').forEach(input => {
    input.addEventListener('change', function (e) {
      const group = e.target.closest('.form-group');
      if (group) group.classList.toggle('has-value', !!e.target.value);
    });
  });

  document.querySelectorAll('.date-input-wrapper').forEach(wrapper => {
    const input = wrapper.querySelector('.date-input');
    const icon = wrapper.querySelector('.date-input-icon');
    if (input && icon) {
      icon.addEventListener('click', function () {
        input.focus();
        if (typeof input.showPicker === 'function') input.showPicker();
        else input.click();
      });
    }
  });

  const form = document.getElementById('task-form');
  if (form) {
    form.addEventListener('reset', function () {
      [startInput, endInput, remindInput].forEach(input => {
        if (input) {
          input.setAttribute('min', today);
          input.removeAttribute('max');
        }
      });
    });
  }
}

// ===== UTILITY FUNCTIONS =====
function getAssigneeName(value) {
  const assignees = {
    'john-smith': 'John Smith',
    'sarah-johnson': 'Sarah Johnson',
    'mike-chen': 'Mike Chen'
  };
  return assignees[value] || 'Unassigned';
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getCurrentDateTime() {
  const now = new Date();
  const date = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${date} at ${time}`;
}

function showFormSuccess() {
  // Create temporary success message
  const successMsg = document.createElement('div');
  successMsg.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #2fb36b;
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 999;
    animation: slideIn 300ms ease-out;
  `;
  successMsg.textContent = '✓ Task created successfully';

  document.body.appendChild(successMsg);

  setTimeout(() => {
    successMsg.style.animation = 'slideOut 300ms ease-in';
    setTimeout(() => successMsg.remove(), 300);
  }, 3000);
}

function formatTimelineTime(createdAt) {
  if (!createdAt) return '';
  if (createdAt.indexOf('T') !== -1) {
    const d = new Date(createdAt);
    const date = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${date} at ${time}`;
  }
  return createdAt;
}

function loadFromStorage() {
  let tasks = null, timeline = null;
  try {
    const t = localStorage.getItem(STORAGE_KEYS.tasks);
    const tl = localStorage.getItem(STORAGE_KEYS.timeline);
    if (t) tasks = JSON.parse(t);
    if (tl) timeline = JSON.parse(tl);
  } catch (e) {}
  if (tasks && tasks.length > 0) {
    renderTasksFromStorage(tasks);
    appState.taskCount = Math.max(...tasks.map(x => x.rowId));
  } else {
    seedTasksFromDOM();
  }
  if (timeline && timeline.length > 0) {
    renderTimelineFromStorage(timeline);
  } else {
    seedTimelineFromDOM();
  }
}

function seedTasksFromDOM() {
  const tbody = document.getElementById('task-table-body');
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  const tasks = [];
  rows.forEach(tr => {
    const rowId = parseInt(tr.dataset.rowId, 10);
    const cells = tr.cells;
    if (!cells || cells.length < 6) return;
    const subjectEl = tr.querySelector('.table-link');
    const subject = subjectEl ? subjectEl.textContent.trim() : '';
    const statusEl = cells[5].querySelector('.status-badge');
    const status = statusEl ? statusEl.textContent.trim().toLowerCase().replace(/\s+/g, '-') : 'pending';
    tasks.push({
      rowId,
      subject,
      type: cells[2].textContent.trim(),
      assignedName: cells[3].textContent.trim(),
      dueDateStr: cells[4].textContent.trim(),
      status
    });
  });
  try {
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
    if (tasks.length) appState.taskCount = Math.max(...tasks.map(x => x.rowId));
  } catch (e) {}
}

function seedTimelineFromDOM() {
  const timeline = document.querySelector('.activity-timeline');
  if (!timeline) return;
  const items = timeline.querySelectorAll('.timeline-item');
  const entries = [];
  items.forEach(item => {
    const h4 = item.querySelector('.timeline-header h4');
    const contactEl = item.querySelector('.contact-name');
    const timeEl = item.querySelector('.timeline-time');
    const detailsEl = item.querySelector('.timeline-details p');
    entries.push({
      subject: h4 ? h4.textContent.trim() : '',
      assignee: contactEl ? contactEl.textContent.trim() : '',
      createdAt: timeEl ? timeEl.textContent.trim() : '',
      details: detailsEl ? detailsEl.textContent.trim() : ''
    });
  });
  try {
    localStorage.setItem(STORAGE_KEYS.timeline, JSON.stringify(entries));
  } catch (e) {}
}

function renderTasksFromStorage(tasks) {
  const tbody = document.getElementById('task-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  const statusLabels = { pending: 'Pending', completed: 'Completed', 'in-progress': 'In Progress' };
  tasks.forEach(task => {
    const tr = document.createElement('tr');
    tr.dataset.rowId = task.rowId;
    const statusClass = (task.status || 'pending').toLowerCase().replace(/\s+/g, '-');
    const statusLabel = statusLabels[statusClass] || (task.status || 'Pending').replace(/-/g, ' ');
    tr.innerHTML = `
      <td>${task.rowId}</td>
      <td><a href="#" class="table-link" data-subject-id="${task.rowId}">${escapeHtml(task.subject)}</a></td>
      <td>${escapeHtml(task.type)}</td>
      <td>${escapeHtml(task.assignedName)}</td>
      <td>${escapeHtml(task.dueDateStr)}</td>
      <td><span class="status-badge ${statusClass}">${escapeHtml(statusLabel)}</span></td>
    `;
    tr.querySelector('.table-link').addEventListener('click', handleSubjectClick);
    tbody.appendChild(tr);
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderTimelineFromStorage(entries) {
  const timeline = document.querySelector('.activity-timeline');
  if (!timeline) return;
  timeline.innerHTML = '';
  entries.forEach((entry, index) => {
    const timeStr = formatTimelineTime(entry.createdAt);
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.innerHTML = `
      <div class="timeline-icon success">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="timeline-content">
        <div class="timeline-header">
          <h4>${escapeHtml(entry.subject || 'Task')}</h4>
        </div>
        <p class="timeline-description">You added a To DO task with <span class="contact-name">${escapeHtml(entry.assignee)}</span></p>
        <p class="timeline-time">${escapeHtml(timeStr)}</p>
        <div class="timeline-details" hidden>
          <p>${escapeHtml(entry.details || '')}</p>
        </div>
        <button class="timeline-expand" aria-expanded="false" aria-label="Expand activity details">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M5 9l7 7 7-7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `;
    timeline.appendChild(item);
    if (index < entries.length - 1) {
      const divider = document.createElement('div');
      divider.className = 'timeline-divider';
      timeline.appendChild(divider);
    }
    item.querySelector('.timeline-expand').addEventListener('click', handleTimelineExpand);
  });
}

function saveTaskToStorage(task) {
  try {
    let tasks = [];
    const stored = localStorage.getItem(STORAGE_KEYS.tasks);
    if (stored) tasks = JSON.parse(stored);
    tasks.unshift(task);
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
  } catch (e) {}
}

function saveTimelineEntryToStorage(entry) {
  try {
    let timeline = [];
    const stored = localStorage.getItem(STORAGE_KEYS.timeline);
    if (stored) timeline = JSON.parse(stored);
    timeline.unshift(entry);
    localStorage.setItem(STORAGE_KEYS.timeline, JSON.stringify(timeline));
  } catch (e) {}
}

// ===== ADD ANIMATION STYLES =====
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(20px);
    }
  }
`;
document.head.appendChild(style);

// ===== KEYBOARD NAVIGATION FOR CUSTOM SELECTS =====
function initializeCustomSelects() {
  // Note: We're using native selects with custom styling
  // for better accessibility. Native selects handle all keyboard
  // navigation automatically.
  // 
  // If we were to build custom select dropdowns, we would add:
  // - Tab navigation to move between selects
  // - Arrow key navigation within open dropdown
  // - Enter/Space to open/close
  // - Escape to close
  // - Type-ahead for filtering
  //
  // For now, native selects provide the best UX for accessibility.
}

// ===== RESPONSIVE TIMELINE SCROLLING =====
function initializeTimelineScrolling() {
  const timeline = document.querySelector('.activity-timeline');

  // On mobile, the timeline will be vertically scrollable by default
  // On larger screens, it's a normal column. This is handled by CSS media queries.
}

// Initialize everything on page load
window.addEventListener('load', () => {
  initializeCustomSelects();
  initializeTimelineScrolling();
});
