import React, { useState, useEffect, useCallback, useRef } from 'react';
import htm from 'htm';
const html = htm.bind(React.createElement);

// ==========================================
// Task Detail Screen
// ==========================================
function TaskDetail({ task, tasks, goHome, goToAdd, refreshTasks, onCompleteTask, constructors }) {
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

  const [localSubtasks, setLocalSubtasks] = useState(task ? [...task.subtasks] : []);
  
  // --- Drag and Drop state ---
  const [dragItemIndex, setDragItemIndex] = useState(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState(null);

  const handleDragStart = (e, i) => {
    setDragItemIndex(i);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e, i) => {
    e.preventDefault();
    setDragOverItemIndex(i);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDragEnd = () => {
  setDragItemIndex(null);
  setDragOverItemIndex(null);
};

  const handleDrop = async (e, i) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragItemIndex !== null && dragItemIndex !== i) {
      const copy = [...localSubtasks];
      const item = copy.splice(dragItemIndex, 1)[0];
      copy.splice(i, 0, item);
      setLocalSubtasks(copy);

      const newIds = copy.map(s => s.id);
      try {
        if (window.pond.reorderSubtasks) {
          await window.pond.reorderSubtasks(task.id, newIds);
        }
      } finally {
        refreshTasks();
      }
    }
    setDragItemIndex(null);
    setDragOverItemIndex(null);
  };
useEffect(() => {
  if (task) {
    setLocalSubtasks(prev => {
      // Stabilize order: if the set of subtask IDs is the same, keep the current order
      if (prev && prev.length > 0 && prev.length === task.subtasks.length) {
        const prevIds = prev.map(s => s.id).sort().join(',');
        const nextIds = task.subtasks.map(s => s.id).sort().join(',');
        if (prevIds === nextIds) {
          return prev.map(ps => {
            const updated = task.subtasks.find(ts => ts.id === ps.id);
            return updated ? { ...ps, ...updated } : ps;
          });
        }
      }
      return [...task.subtasks];
    });
  }
}, [task]);

// --- Drag and Drop state ---
const handleToggle = async (subtaskId) => {
  const current = localSubtasks.find(s => s.id === subtaskId);
  if (!current) return;
  const newState = !current.completed;

  // 1. Update ONLY the completion state in local state, NOT the order
  // This prevents the row from jumping while the user is looking at it
  const updatedLocal = localSubtasks.map(st =>
    st.id === subtaskId ? { ...st, completed: newState } : st
  );
  setLocalSubtasks(updatedLocal);

  // 2. Persist completion state to DB
  await window.pond.toggleSubtask(subtaskId);

  // 3. Calculate and persist the "eventual" order for the DB
  // Completed items will move to the bottom next time the list is loaded
  const forDB = [...updatedLocal].sort((a, b) => {
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    return 0;
  });

  const newIds = forDB.map(s => s.id);
  if (window.pond.reorderSubtasks) {
    await window.pond.reorderSubtasks(task.id, newIds);
  }

  const fullyDone = updatedLocal.length > 0 && updatedLocal.every(st => st.completed);
  if (fullyDone) { 
    onCompleteTask(task); 
  } else { 
    // Refresh parent state so the car moves on the track background
    await refreshTasks(); 
  }
};

  // --- Progress calculations ---
  const hasSubtasks = localSubtasks && localSubtasks.length > 0;
  const completedCount = hasSubtasks ? localSubtasks.filter(s => s.completed).length : 0;
  const totalCount = hasSubtasks ? localSubtasks.length : 0;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // --- Sector breakdown ---
  let s1Total = 0, s2Total = 0, s3Total = 0;
  let s1Done = 0, s2Done = 0, s3Done = 0;
  
  if (totalCount > 0) {
    s1Total = Math.ceil(totalCount / 3);
    s2Total = Math.ceil((totalCount - s1Total) / 2);
    s3Total = totalCount - s1Total - s2Total;

    const s1Items = localSubtasks.slice(0, s1Total);
    const s2Items = localSubtasks.slice(s1Total, s1Total + s2Total);
    const s3Items = localSubtasks.slice(s1Total + s2Total);

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

  // --- Progress circle ---
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progressPct / 100) * circumference;

  const laneConstr = constructors.find(c => c.id === task.constructor_id) || {};
  const accentColor = laneConstr.primary_color || '#ffffff';
const position = (() => {
  const activeTasks = tasks ? tasks.filter(t => t.lane >= 1 && t.lane <= 10) : [];
  if (!activeTasks || activeTasks.length === 0) return 1;
  const ranked = [...activeTasks].sort((a, b) => {
    const pctA = a.subtasks.length > 0
      ? a.subtasks.filter(s => s.completed).length / a.subtasks.length
      : 0;
    const pctB = b.subtasks.length > 0
      ? b.subtasks.filter(s => s.completed).length / b.subtasks.length
      : 0;
    return pctB - pctA;
  });
  const idx = ranked.findIndex(t => t.id === task.id);
  return idx !== -1 ? idx + 1 : 1;
})();

  // --- Render ---
  return html`
    <div class="overlay-modal">
      <div class="detail-shell">

        <!-- Header -->
        <div class="detail-header">
          <div style=${{ justifySelf: 'start', display: 'flex' }}>
            <button class="back-btn" onClick=${goHome}>
              <span class="back-arrow-box">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </span>
              Pit Lane
            </button>
          </div>
          <div style=${{ justifySelf: 'center', display: 'flex' }}>
            ${laneConstr.name ? html`
              <div class="team-badge" style=${{ borderColor: accentColor + '88', background: accentColor + '33' }}>
               
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
              ${hasSubtasks ? localSubtasks.map((st, i) => html`
                <div
                  class=${'detail-st-row' + (st.completed ? ' st-done' : '')}
                  key=${st.id}
                  draggable="true"
                  onClick=${() => handleToggle(st.id)}
                  onDragStart=${(e) => handleDragStart(e, i)}
                  onDragEnter=${(e) => handleDragEnter(e, i)}
                  onDragOver=${handleDragOver}
                  onDrop=${(e) => handleDrop(e, i)}
                  onDragEnd=${handleDragEnd}
                  style=${dragItemIndex === i ? { opacity: 0.3 } : (dragOverItemIndex === i && dragItemIndex !== i ? { borderTop: dragItemIndex > i ? '2px solid rgba(255,255,255,0.4)' : '', borderBottom: dragItemIndex < i ? '2px solid rgba(255,255,255,0.4)' : '' } : {})}
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
                <span class="btn-text-skew-reverse">CHEQUERED FLAG</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}

export default TaskDetail;
