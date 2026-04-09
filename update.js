const fs = require('fs');

// 1. Update styles.css
let styles = fs.readFileSync('renderer/styles.css', 'utf-8');

// Change font imports
styles = styles.replace(/@import url.*Outfit.*/, "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');");
styles = styles.replace(/font-family:\s*'Outfit'.*/g, "font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;");
styles = styles.replace(/font-family:\s*'Rajdhani'.*;/g, "font-family: inherit;");

// Remove text shadows on titles
styles = styles.replace(/text-shadow:\s*0 0 10px rgba\(255,255,255,0\.2\);\n/g, "");

// btn-launch nowrap
styles = styles.replace(/\.btn-launch \{/, ".btn-launch {\n  white-space: nowrap;");

// btn-abort styling
styles = styles.replace(/\.btn-abort \{[\s\S]*?\}/, `.btn-abort {
  flex: 1;
  padding: 11px;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}`);
styles = styles.replace(/\.btn-abort:hover \{[\s\S]*?\}/, `.btn-abort:hover {
  color: #fff;
}`);

// objectives gap 
styles = styles.replace(/\.subtask-scroll \{[\s\S]*?\}/, `.subtask-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  margin-top: 6px;
}`);

// back arrow box
styles = styles.replace(/\.back-arrow-box \{[\s\S]*?\}/, `.back-arrow-box {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s;
}`);
styles = styles.replace(/\.back-btn:hover \.back-arrow-box \{[\s\S]*?\}/, `.back-btn:hover .back-arrow-box {
  transform: translateX(-2px);
}`);

fs.writeFileSync('renderer/styles.css', styles);


// 2. Update AddTaskScreen.js
let addTask = fs.readFileSync('renderer/AddTaskScreen.js', 'utf-8');

// Replace left arrow with SVG
addTask = addTask.replace(/<span class="back-arrow-box">←<\/span>/g, '<span class="back-arrow-box"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></span>');

// Replace [01] numbering logic
const objBulletOld = /<span class="obj-bullet"[\s\S]*?\[\$\{\(i \+ 1\)[\s\S]*?<\/span>/;
addTask = addTask.replace(objBulletOld, '<span class="obj-bullet" style={{ cursor: \'grab\' }}>≡</span>');

fs.writeFileSync('renderer/AddTaskScreen.js', addTask);


// 3. Update TaskDetailScreen.js
let detailTask = fs.readFileSync('renderer/TaskDetailScreen.js', 'utf-8');

detailTask = detailTask.replace(/<span class="back-arrow-box">←<\/span>/g, '<span class="back-arrow-box"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></span>');

const objNumDetailOld = /<span style=\{\{ fontFamily: '"Rajdhani", monospace'[\s\S]*?\[\$\{\(i \+ 1\)[\s\S]*?<\/span>\n\s*/;
detailTask = detailTask.replace(objNumDetailOld, '');

fs.writeFileSync('renderer/TaskDetailScreen.js', detailTask);

console.log('Update Complete');
