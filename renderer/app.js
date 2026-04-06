// HTM + React — no build step needed
const html = htm.bind(React.createElement);
const { useState, useEffect, useCallback, useRef } = React;

// ==========================================
// Checkbox Component
// ==========================================
function Checkbox({ checked, onChange }) {
  return html`
    <button
      class=${checked ? 'checkbox checked' : 'checkbox'}
      onClick=${onChange}
    >
      ${checked ? '✓' : ''}
    </button>
  `;
}

// ==========================================
// Home Screen (Track View)
// ==========================================
function Home({ tasks, constructors, onAddClick, onTaskClick, onShortcutsClick, finishing, onSwapLanes }) {
  const [dragOverLane, setDragOverLane] = useState(null);

  return html`
    <div class="lanes-wrapper">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lane => {
        const task = tasks.find(t => t.lane === lane);
        const isFinishingLane = finishing && finishing.lane === lane;
        const laneTask = isFinishingLane ? (finishing.task || task) : task;
        const laneConstr = constructors.find(c => c.id === lane);

        let progress = 0;
        if (laneTask && laneTask.subtasks && laneTask.subtasks.length > 0) {
          const comp = laneTask.subtasks.filter(s => s.completed).length;
          progress = comp / laneTask.subtasks.length;
        }

        let bottomPx = laneTask ? Math.round(24 + (progress * 323)) : 24;
        if (isFinishingLane && finishing.offscreen) bottomPx = 560;
        const carImgSrc = laneConstr ? `../assets/cars/car${laneConstr.id}.png` : '';

        return html`
          <div
            key=${lane}
            class=${'lane' + (dragOverLane === lane ? ' drag-over-lane' : '')}
            data-lane=${lane}
            onDragOver=${(e) => {
              e.preventDefault();
              setDragOverLane(lane);
            }}
            onDragLeave=${() => setDragOverLane(null)}
            onDrop=${(e) => {
              e.preventDefault();
              setDragOverLane(null);
              const source = e.dataTransfer.getData('sourceLane');
              if (source && parseInt(source, 10) !== lane) {
                onSwapLanes(parseInt(source, 10), lane);
              }
            }}
            onClick=${() => laneTask ? onTaskClick(laneTask.id) : onAddClick(lane)}
          >
            ${laneTask ? html`
              <div class="car-img" style=${{ bottom: bottomPx + 'px', cursor: 'grab' }}
                   draggable="true"
                   onDragStart=${(e) => {
                     e.stopPropagation();
                     e.dataTransfer.setData('sourceLane', lane);
                     e.dataTransfer.effectAllowed = 'move';
                   }}
              >
                <img
                  src=${carImgSrc}
                  onError=${(e) => { e.target.style.display = 'none'; }}
                  style=${{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
                />
              </div>
              <div class="task-label">${laneTask.title}</div>
            ` : null}
            ${!laneTask ? html`
              <button
                class="add-lane-btn"
                onClick=${(e) => { e.stopPropagation(); onAddClick(lane); }}
              >+</button>
            ` : null}
          </div>
        `;
      })}
    </div>
    <div class="home-footer">
      <span class="watermark">Made by Puneet Kathuria</span>
      <button class="shortcuts-trigger" onClick=${onShortcutsClick}>Shortcuts</button>
    </div>
  `;
}

// ==========================================
// Add Task Screen
// ==========================================
function AddTask({ goHome, constructors, preSelectedConstructorId, editTask }) {
  const [title, setTitle] = useState(editTask ? editTask.title : '');
  const [note, setNote] = useState(editTask ? (editTask.note || '') : '');
  const [subtasks, setSubtasks] = useState(() => {
    if (editTask && editTask.subtasks) {
      return [...editTask.subtasks];
    }
    return [];
  });
  const [constructorId, setConstructorId] = useState(editTask ? editTask.constructor_id : (preSelectedConstructorId || null));
  const [error, setError] = useState('');
  const titleRef = useRef(null);
  const noteRef = useRef(null);
  const subtaskRefs = useRef([]);

  const [dragItemIndex, setDragItemIndex] = useState(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState(null);

  const handleDragStart = (e, i) => {
    setDragItemIndex(i);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragEnter = (e, i) => {
    setDragOverItemIndex(i);
  };
  
  const handleDragEnd = () => {
    if (dragItemIndex !== null && dragOverItemIndex !== null && dragItemIndex !== dragOverItemIndex) {
      setSubtasks(prev => {
        const copy = [...prev];
        const item = copy.splice(dragItemIndex, 1)[0];
        copy.splice(dragOverItemIndex, 0, item);
        return copy;
      });
    }
    setDragItemIndex(null);
    setDragOverItemIndex(null);
  };

  useEffect(() => { titleRef.current && titleRef.current.focus(); }, []);

  useEffect(() => {
    const handleSaveLaunch = () => {
      handleSubmit();
    };
    document.addEventListener('pond:save-launch', handleSaveLaunch);
    return () => document.removeEventListener('pond:save-launch', handleSaveLaunch);
  }, [title, note, subtasks, constructorId, editTask]);

  const addSubtask = () => {
    setSubtasks(prev => [...prev, { title: '', completed: false }]);
    setTimeout(() => {
      const refs = subtaskRefs.current;
      if (refs[refs.length - 1]) refs[refs.length - 1].focus();
    }, 50);
  };

  const updateSubtask = (i, val) => {
    setSubtasks(prev => { 
      const n = [...prev]; 
      n[i] = typeof n[i] === 'string' ? { title: val, completed: false } : { ...n[i], title: val }; 
      return n; 
    });
  };

  const removeSubtask = (i) => {
    setSubtasks(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleTitleKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
  };

  const handleSubtaskKey = (e, i) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) { addSubtask(); } else { handleSubmit(); }
    } else if (e.key === 'Backspace') {
      const titleStr = typeof subtasks[i] === 'string' ? subtasks[i] : subtasks[i].title;
      if (titleStr === '') {
        e.preventDefault();
        removeSubtask(i);
        if (i > 0) setTimeout(() => subtaskRefs.current[i - 1] && subtaskRefs.current[i - 1].focus(), 50);
        else noteRef.current && noteRef.current.focus();
      }
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) { setError('Title required'); return; }
    if (!constructorId) { setError('Choose a constructor'); return; }
    setError('');
    
    if (editTask) {
      await window.pond.updateTask({
        id: editTask.id,
        title: title.trim(),
        note: note.trim() || null,
        subtasks: subtasks.filter(s => {
          const t = typeof s === 'string' ? s : s.title;
          return t && t.trim();
        }),
        constructor_id: constructorId
      });
    } else {
      await window.pond.addTask({
        title: title.trim(),
        note: note.trim() || null,
        subtasks: subtasks.map(s => typeof s === 'string' ? s : s.title).filter(t => t && t.trim()),
        constructor_id: constructorId
      });
    }
    goHome();
  }, [title, note, subtasks, constructorId, editTask, goHome]);

  const selectedConstr = (constructors || []).find(c => c.id === constructorId);

  const objectivesContent = html`
    <div class="objectives-section">
      <div class="section-eyebrow">Objectives</div>
      <div class=${'subtask-scroll' + (editTask ? ' edit-spacing' : '')}>
        ${subtasks.map((st, i) => html`
          <div class="objective-row" key=${st.id || i}
               draggable="true"
               onDragStart=${(e) => handleDragStart(e, i)}
               onDragEnter=${(e) => handleDragEnter(e, i)}
               onDragEnd=${handleDragEnd}
               onDragOver=${(e) => e.preventDefault()}
               style=${dragItemIndex === i ? { opacity: 0.3 } : (dragOverItemIndex === i && dragItemIndex !== i ? { borderTop: dragItemIndex > i ? '2px solid #fff' : '', borderBottom: dragItemIndex < i ? '2px solid #fff' : '' } : {})}
          >
            <span class="obj-bullet" style=${{ cursor: 'grab' }}>≡</span>
            <input
              ref=${(el) => { subtaskRefs.current[i] = el; }}
              class="objective-input"
              type="text"
              placeholder="Objective ${i + 1}"
              value=${typeof st === 'string' ? st : st.title}
              onInput=${(e) => updateSubtask(i, e.target.value)}
              onKeyDown=${(e) => handleSubtaskKey(e, i)}
            />
            <button class="obj-remove" onClick=${() => removeSubtask(i)}>×</button>
          </div>
        `)}
        <button class="add-objective-btn" onClick=${addSubtask}>+ Add Objective</button>
      </div>
    </div>
  `;

  return html`
    <div class=${'overlay-modal' + (editTask ? ' no-anim' : '')}>
      <div class="detail-shell">
        <div class="detail-header">
          <div style=${{ justifySelf: 'start', display: 'flex' }}>
            <button class="back-btn" onClick=${goHome}>
              <span class="back-arrow-box">←</span>
              Pit Lane
            </button>
          </div>
          <div style=${{ justifySelf: 'center', display: 'flex' }}>
            ${selectedConstr ? html`
              <div class="team-badge" style=${{ borderColor: selectedConstr.primary_color + '88', background: selectedConstr.primary_color + '33' }}>
                <div class="badge-pip" style=${{ background: selectedConstr.primary_color }}></div>
                <span class="badge-team" style=${{ color: selectedConstr.primary_color }}>${selectedConstr.name.toUpperCase()}</span>
              </div>
            ` : null}
          </div>
          <div style=${{ justifySelf: 'end', display: 'flex' }}></div>
        </div>

        <div class="add-task-garage">

        <!-- Left: Telemetry panel -->
        <div class="garage-left-panel">
          <div class="panel-eyebrow">Race Engineer — Task Brief</div>

          <div class="title-section">
            <input
              ref=${titleRef}
              class="task-title-input"
              type="text"
              placeholder="Mission name..."
              value=${title}
              onInput=${(e) => setTitle(e.target.value)}
              onKeyDown=${handleTitleKey}
            />
          </div>

          <div class="note-wrapper" style=${editTask ? { flex: 1, minHeight: 0, display: 'flex' } : {}}>
            <textarea
              ref=${noteRef}
              class="task-note-input"
              placeholder="Telemetry notes (optional)"
              value=${note}
              onInput=${(e) => setNote(e.target.value)}
              style=${editTask ? { flex: 1, height: '100%', resize: 'none' } : {}}
            />
            <span class="note-close-btn" onMouseDown=${(e) => { e.preventDefault(); noteRef.current.blur(); }}>DONE</span>
          </div>

          ${!editTask ? objectivesContent : null}
          
          ${editTask ? html`
            <div class="launch-row" style=${{ marginTop: 'auto' }}>
              <button class="btn-abort" onClick=${goHome}>Abort</button>
              <button
                class="btn-launch"
                style=${{ background: selectedConstr ? selectedConstr.primary_color : '#ffffff' }}
                onClick=${handleSubmit}
              >
                Save Pit Stop ▶
              </button>
            </div>
          ` : null}
        </div>

        ${editTask ? html`
          <div class="garage-right-panel" style=${{ padding: 0, border: 'none', background: 'transparent' }}>
            <div class="garage-left-panel" style=${{ flex: 1, margin: 0 }}>
              ${objectivesContent}
            </div>
          </div>
        ` : html`
        <!-- Right: Garage / Constructor picker -->
        <div class="garage-right-panel">
          <div class="panel-top-bar" style=${{ background: 'rgba(255,255,255,0.1)' }}></div>
          <div class="panel-eyebrow">Garage Bay — Constructor</div>

          ${error ? html`<div class="garage-error-pill" style=${{ marginTop: '10px' }}>${error}</div>` : null}

          <div class="constructor-grid">
            ${(constructors || []).map(c => html`
              <div
                key=${c.id}
                class=${'constructor-tile' + (!c.available ? ' tile-disabled' : '') + (constructorId === c.id ? ' tile-selected' : '')}
                style=${{
                  borderColor: constructorId === c.id ? c.primary_color : 'transparent',
                  boxShadow: constructorId === c.id ? ('0 0 0 1px ' + c.primary_color + ', inset 0 0 20px rgba(0,0,0,0.3)') : 'none',
                  cursor: 'pointer'
                }}
                onClick=${() => { if (c.available) { setConstructorId(c.id); setError(''); } }}
              >
                <div class="tile-color-bar" style=${{ background: c.primary_color }}></div>
                <span class="tile-name">${c.name}</span>
                ${!c.available ? html`<span class="tile-occupied">●</span>` : null}
              </div>
            `)}
          </div>

          <div class="launch-row">
            <button class="btn-abort" onClick=${goHome}>Abort</button>
            <button
              class="btn-launch"
              style=${{ background: selectedConstr ? selectedConstr.primary_color : '#ffffff' }}
              onClick=${handleSubmit}
            >
              Launch ▶
            </button>
          </div>
        </div>
        `}

        </div>
      </div>
    </div>
  `;
}

// ==========================================
// Task Detail Screen
// ==========================================
function TaskDetail({ task, goHome, goToAdd, refreshTasks, onCompleteTask, constructors }) {
  if (!task) {
    return html`
      <div class="overlay-modal">
        <div class="detail-shell">
          <div class="detail-header">
            <button class="back-btn" onClick=${goHome}>
              <span class="back-arrow-box">←</span>
              Pit Lane
            </button>
          </div>
          <div class="empty-state">Task lost on track.</div>
        </div>
      </div>
    `;
  }

  const handleToggle = async (subtaskId) => {
    const current = task.subtasks.find(s => s.id === subtaskId);
    const newState = current ? !current.completed : true;
    await window.pond.toggleSubtask(subtaskId);
    const evaluated = task.subtasks.map(ch =>
      ch.id === subtaskId ? { ...ch, completed: newState } : ch
    );
    const fullyDone = evaluated.length > 0 && evaluated.every(st => st.completed);
    if (fullyDone) { onCompleteTask(task); } else { await refreshTasks(); }
  };

  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedCount = hasSubtasks ? task.subtasks.filter(s => s.completed).length : 0;
  const totalCount = hasSubtasks ? task.subtasks.length : 0;
  // Handle 0/0 edge case: if no subtasks, progress is 0%
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Sector breakdown: securely split subtasks into 3 perfectly bounded sectors
  let s1Total = 0, s2Total = 0, s3Total = 0;
  let s1Done = 0, s2Done = 0, s3Done = 0;
  
  if (totalCount > 0) {
    s1Total = Math.ceil(totalCount / 3);
    s2Total = Math.ceil((totalCount - s1Total) / 2);
    s3Total = totalCount - s1Total - s2Total;

    const s1Items = task.subtasks.slice(0, s1Total);
    const s2Items = task.subtasks.slice(s1Total, s1Total + s2Total);
    const s3Items = task.subtasks.slice(s1Total + s2Total);

    s1Done = s1Items.filter(s => s.completed).length;
    s2Done = s2Items.filter(s => s.completed).length;
    s3Done = s3Items.filter(s => s.completed).length;
  }

  const sectorColor = (done, total) => {
    if (total === 0) return 'rgba(255,255,255,0.08)';
    const r = done / total;
    if (r === 1) return '#00d066';
    if (r > 0) return '#ffe000';
    return 'rgba(255,255,255,0.08)';
  };

  // Circle arc - ensure perfect bounding
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progressPct / 100) * circumference;

  const laneConstr = constructors.find(c => c.id === task.constructor_id) || {};
  const accentColor = laneConstr.primary_color || '#ffffff';

  // Position display: task with most progress = P1
  const position = 1;

  return html`
    <div class="overlay-modal">
      <div class="detail-shell">

        <!-- Header -->
        <div class="detail-header">
          <div style=${{ justifySelf: 'start', display: 'flex' }}>
            <button class="back-btn" onClick=${goHome}>
              <span class="back-arrow-box">←</span>
              Pit Lane
            </button>
          </div>
          <div style=${{ justifySelf: 'center', display: 'flex' }}>
            ${laneConstr.name ? html`
              <div class="team-badge" style=${{ borderColor: accentColor + '88', background: accentColor + '33' }}>
                <div class="badge-pip" style=${{ background: accentColor }}></div>
                <span class="badge-team" style=${{ color: accentColor }}>${laneConstr.name.toUpperCase()}</span>
              </div>
            ` : null}
          </div>
          <div style=${{ justifySelf: 'end', display: 'flex' }}>
            <button class="back-btn" style=${{ paddingRight: 0 }} onClick=${() => goToAdd(task.constructor_id, task)}>
              Edit
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="detail-body">

          <!-- Left: task info + subtasks -->
          <div class="detail-left-panel">
            <div class="detail-task-title">${task.title}</div>
            ${task.note ? html`<p class="detail-task-note">${task.note}</p>` : null}

            <div class="objectives-header">
              <span class="section-eyebrow">Objectives</span>
              <span class="section-eyebrow">${completedCount} / ${totalCount} complete</span>
            </div>

            <div class="detail-subtask-list">
              ${hasSubtasks ? task.subtasks.map(st => html`
                <div
                  class=${'detail-st-row' + (st.completed ? ' st-done' : '')}
                  key=${st.id}
                  onClick=${() => handleToggle(st.id)}
                >
                  <div class=${'detail-chk' + (st.completed ? ' chk-filled' : '')}
                    style=${{ borderColor: st.completed ? accentColor : 'rgba(255,255,255,0.2)', background: st.completed ? accentColor : 'transparent' }}
                  >
                    ${st.completed ? '✓' : ''}
                  </div>
                  <span class=${st.completed ? 'st-label done' : 'st-label'}>${st.title}</span>
                </div>
              `) : html`<div class="empty-state" style=${{ flex: 1, fontSize: '12px' }}>No objectives set.</div>`}
            </div>
          </div>

          <!-- Right: race data -->
          <div class="detail-right-col">
            <!-- Progress circle card -->
            <div class="race-data-card">
              <div class="section-eyebrow">Race Progress</div>

              <div class="progress-circle-wrap">
                <svg width="90" height="90" viewBox="0 0 90 90" style=${{ transform: 'rotate(-90deg)' }}>
                  <circle cx="45" cy="45" r=${radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7"/>
                  <circle
                    cx="45" cy="45" r=${radius}
                    fill="none"
                    stroke=${accentColor}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray=${circumference}
                    strokeDashoffset=${dashOffset}
                    style=${{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                <div class="circle-label">
                  <span class="circle-pct">${progressPct}</span>
                  <span class="circle-unit">PCT</span>
                </div>
              </div>

              <div class="sector-bars">
                ${[
                  ['S1', s1Done, s1Total],
                  ['S2', s2Done, s2Total],
                  ['S3', s3Done, s3Total],
                ].map(([label, done, total]) => html`
                  <div class="sector-row" key=${label}>
                    <span class="sector-label">${label}</span>
                    <div class="sector-track">
                      <div class="sector-fill" style=${{
                        width: (total > 0 ? Math.round((done / total) * 100) : 0) + '%',
                        background: sectorColor(done, total)
                      }}></div>
                    </div>
                  </div>
                `)}
              </div>
            </div>

            <!-- Stats + flag card -->
            <div class="race-data-card flag-card">
              <div class="pit-stats">
                <div class="pit-stat-row">
                  <span class="pit-key">Position</span>
                  <span class="pit-val">P${position}</span>
                </div>
                <div class="pit-stat-row">
                  <span class="pit-key">Remaining</span>
                  <span class="pit-val">${totalCount - completedCount} obj</span>
                </div>
              </div>
              <button
                class="chequered-btn"
                onClick=${() => onCompleteTask(task)}
              >
                CHEQUERED FLAG
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}

// ==========================================
// Shortcuts Modal
// ==========================================
function ShortcutsModal({ onClose }) {
  return html`
    <div class="overlay-modal" onClick=${onClose}>
      <div class="shortcuts-panel" onClick=${(e) => e.stopPropagation()}>
        <div class="detail-header">
          <button class="back-btn" onClick=${onClose}>
            <span class="back-arrow-box">←</span>
            Back to Track
          </button>
        </div>
        <div class="panel-eyebrow" style=${{ marginTop: '10px' }}>Keyboard Shortcuts</div>
        <div class="shortcuts-grid">
          <span class="shortcut-label">New Task</span>
          <div class="shortcut-keys">
            <span class="key">⌘</span><span class="key">N</span>
          </div>
          <span class="shortcut-label">Save / Launch</span>
          <div class="shortcut-keys">
            <span class="key">⌘</span><span class="key">S</span>
          </div>
          <span class="shortcut-label">Save / Launch</span>
          <div class="shortcut-keys">
            <span class="key">⌘</span><span class="key">↵</span>
          </div>
          <span class="shortcut-label">Go Back / Close</span>
          <div class="shortcut-keys">
            <span class="key">Esc</span>
          </div>
          <span class="shortcut-label">Toggle Popover</span>
          <div class="shortcut-keys">
            <span class="key">⌘</span><span class="key">⇧</span><span class="key">P</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ==========================================
// Celebration Overlay
// ==========================================
function CelebrationOverlay({ task, onClose, onAdd }) {
  return html`
    <div class="overlay-modal glass-blur celebration-overlay">
      <div class="celebrating-card">
        <div class="celebrating-header">
          <div class="trophy-icon">🏁</div>
          <div class="celebration-subtitle">Task Finished</div>
        </div>
        <div class="celebration-title">CONGRATULATIONS</div>
        
        <div class="celebration-actions" style=${{ marginTop: '24px', width: '260px' }}>
          <button class="btn-return-pit" onClick=${onClose}>
            Close Window
          </button>
          <button class="btn-stay-garage" onClick=${onAdd}>
            Add New Task
          </button>
        </div>
      </div>
    </div>
  `;
}

// ==========================================
// App Root
// ==========================================
function App() {
  const [screen, setScreen] = useState('home');
  const [tasks, setTasks] = useState([]);
  const [constructors, setConstructors] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [intendedConstructorId, setIntendedConstructorId] = useState(null);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [finishing, setFinishing] = useState(null);
  const [celebratedTask, setCelebratedTask] = useState(null);

  const refreshData = useCallback(async () => {
    try {
      if (window.pond.getConstructors) {
        const [tData, cData] = await Promise.all([
          window.pond.getTasks(),
          window.pond.getConstructors()
        ]);
        setConstructors(cData);
        setTasks(tData);
      } else {
        const data = await window.pond.getTasks();
        setTasks(data);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  }, []);

  const handleSwapLanes = useCallback(async (laneA, laneB) => {
    if (laneA === laneB) return;
    await window.pond.swapLanes(laneA, laneB);
    await refreshData();
  }, [refreshData]);

  useEffect(() => { refreshData(); }, [refreshData]);

  useEffect(() => {
    if (window.pond && window.pond.onShow) {
      const cleanup = window.pond.onShow(() => {
        refreshData();
        setScreen('home');
        setSelectedTaskId(null);
      });
      return cleanup;
    }
  }, [refreshData]);

  const goHome = useCallback(() => {
    setScreen('home');
    setTaskToEdit(null);
    refreshData();
  }, [refreshData]);

  const handleCompleteTask = useCallback(async (task) => {
    // Drive finish animation via React state so it doesn't get overwritten by re-renders.
    // We only mark the task complete in the DB AFTER the animation finishes.
    setFinishing({ task, lane: task.lane, offscreen: false });
    setScreen('home');
    setSelectedTaskId(null);

    // Kick the car "offscreen" (CSS transition on `bottom` will animate).
    setTimeout(() => {
      setFinishing((prev) => (prev ? { ...prev, offscreen: true } : prev));
    }, 80);

    // Persist completion & refresh tasks after animation.
    setTimeout(async () => {
      try {
        await window.pond.completeTask(task.id);
      } finally {
        setFinishing(null);
        refreshData();
        
        setCelebratedTask(task);
        if (typeof window.confetti === 'function') {
           const laneConstr = constructors.find(c => c.id === task.constructor_id) || {};
           const accentColor = laneConstr.primary_color || '#ffffff';
           window.confetti({     
             particleCount: 150,
             spread: 80,
             origin: { y: 0.6 },
             colors: [accentColor, laneConstr.secondary_color || '#ffffff', '#ffffff'],
             zIndex: 2000
           });
        }
      }
    }, 650);
  }, [refreshData, constructors]);

  const goToAdd = useCallback((constructorId, taskObj = null) => {
    setIntendedConstructorId(constructorId || null);
    setTaskToEdit(taskObj);
    setScreen('add');
  }, []);

  const goToDetail = useCallback((id) => {
    setSelectedTaskId(id);
    setScreen('detail');
  }, []);

  const handleSaveOrLaunch = useCallback(() => {
    if (screen === 'add') {
      // Trigger the submit handler in AddTask
      // We'll use a custom event to communicate with AddTask
      const event = new CustomEvent('pond:save-launch');
      document.dispatchEvent(event);
    }
  }, [screen]);

  useEffect(() => {
    const handler = (e) => {
      // Cmd/Ctrl + N: New Task
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        goToAdd(null);
        return;
      }

      // Cmd/Ctrl + S: Save/Launch
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSaveOrLaunch();
        return;
      }

      // Cmd/Ctrl + Enter: Save/Launch
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSaveOrLaunch();
        return;
      }

      // Escape: Navigate back / Close overlays
      if (e.key === 'Escape') {
        if (showShortcuts) {
          setShowShortcuts(false);
        } else if (screen !== 'home') {
          setScreen('home');
          setTaskToEdit(null);
        } else if (window.pond && window.pond.escape) {
          window.pond.escape();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [screen, showShortcuts, goToAdd, handleSaveOrLaunch]);

  return html`
    <div class="pond-root">
      <div class="track-container">
        <${Home}
          tasks=${tasks}
          constructors=${constructors}
          onAddClick=${goToAdd}
          onTaskClick=${goToDetail}
          onShortcutsClick=${() => setShowShortcuts(true)}
          finishing=${finishing}
          onSwapLanes=${handleSwapLanes}
        />
        ${screen === 'add' ? html`
          <${AddTask}
            goHome=${goHome}
            constructors=${constructors}
            preSelectedConstructorId=${intendedConstructorId}
            editTask=${taskToEdit}
          />
        ` : null}
        ${screen === 'detail' ? html`
          <${TaskDetail}
            task=${tasks.find(t => t.id === selectedTaskId) || null}
            goHome=${goHome}
            goToAdd=${goToAdd}
            refreshTasks=${refreshData}
            constructors=${constructors}
            onCompleteTask=${handleCompleteTask}
          />
        ` : null}
        ${celebratedTask ? html`
          <${CelebrationOverlay}
            task=${celebratedTask}
            onClose=${() => { setCelebratedTask(null); window.pond.escape(); }}
            onAdd=${() => { setCelebratedTask(null); goToAdd(null); }}
          />
        ` : null}
        ${showShortcuts ? html`
          <${ShortcutsModal} onClose=${() => setShowShortcuts(false)} />
        ` : null}
      </div>
    </div>
  `;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${App} />`);