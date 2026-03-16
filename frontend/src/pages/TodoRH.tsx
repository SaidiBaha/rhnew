// import { useState } from "react";

// const initialTasks = [
//   {
//     id: 1,
//     category: "🎨 UI / Design",
//     color: "#6C63FF",
//     tasks: [
//       { id: 101, text: "Changer le template de l'application RH avec le thème et le code couleur", done: false, priority: "high" },
//       { id: 102, text: "Modifier et améliorer l'affichage de l'interface Permutations et Opérateurs disponibles", done: false, priority: "medium" },
//     ]
//   },
//   {
//     id: 2,
//     category: "⚙️ Backend / Frontend",
//     color: "#FF6584",
//     tasks: [
//       { id: 201, text: "Appliquer la pagination sur getAllEmployee (backend + frontend) pour un chargement rapide", done: false, priority: "high" },
//       { id: 202, text: "Ajouter les notifications pour les transferts des opérateurs", done: false, priority: "high" },
//       { id: 203, text: "Ajouter un dashboard Permutation pour les superviseurs (statistiques & charts)", done: false, priority: "medium" },
//     ]
//   },
//   {
//     id: 3,
//     category: "🐛 Bug Fixes",
//     color: "#F59E0B",
//     tasks: [
//       { id: 301, text: "Corriger les bugs du module Requests liés à l'ajout de la pagination", done: false, priority: "high" },
//       { id: 302, text: "Corriger les bugs du module Permutations liés à l'ajout de la pagination", done: false, priority: "high" },
//     ]
//   },
//   {
//     id: 4,
//     category: "🧪 Test & Debugging",
//     color: "#10B981",
//     tasks: [
//       { id: 401, text: "Tester les fonctionnalités SaveBatch Employee", done: false, priority: "medium" },
//       { id: 402, text: "Tester les fonctionnalités du module Requests", done: false, priority: "medium" },
//       { id: 403, text: "Tester les fonctionnalités du module Permutations", done: false, priority: "medium" },
//       { id: 404, text: "Tester les fonctionnalités du Pointage", done: false, priority: "low" },
//       { id: 405, text: "Tester les fonctionnalités des Avances", done: false, priority: "low" },
//     ]
//   }
// ];

// const priorityConfig = {
//   high: { label: "Urgent", bg: "#FEE2E2", text: "#DC2626", dot: "#EF4444" },
//   medium: { label: "Normal", bg: "#FEF3C7", text: "#D97706", dot: "#F59E0B" },
//   low: { label: "Bas", bg: "#DCFCE7", text: "#16A34A", dot: "#22C55E" },
// };

// export default function TodoRH() {
//   const [categories, setCategories] = useState(initialTasks);
//   const [filter, setFilter] = useState("all");

//   const toggleTask = (catId, taskId) => {
//     setCategories(prev =>
//       prev.map(cat =>
//         cat.id === catId
//           ? { ...cat, tasks: cat.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t) }
//           : cat
//       )
//     );
//   };

//   const totalTasks = categories.flatMap(c => c.tasks).length;
//   const doneTasks = categories.flatMap(c => c.tasks).filter(t => t.done).length;
//   const progress = Math.round((doneTasks / totalTasks) * 100);

//   const filteredCategories = categories.map(cat => ({
//     ...cat,
//     tasks: cat.tasks.filter(t =>
//       filter === "all" ? true : filter === "done" ? t.done : !t.done
//     )
//   })).filter(cat => cat.tasks.length > 0);

//   return (
//     <div style={{
//       minHeight: "100vh",
//       background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
//       fontFamily: "'Segoe UI', system-ui, sans-serif",
//       padding: "2rem 1rem",
//       color: "#fff"
//     }}>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
//         * { box-sizing: border-box; margin: 0; padding: 0; }
//         .task-card { transition: all 0.2s ease; cursor: pointer; }
//         .task-card:hover { transform: translateX(4px); }
//         .pill { transition: all 0.15s ease; cursor: pointer; }
//         .pill:hover { opacity: 0.85; transform: scale(0.97); }
//         @keyframes fadeIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: none; } }
//         .cat-block { animation: fadeIn 0.4s ease both; }
//         @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.6} }
//         .progress-bar { transition: width 0.6s cubic-bezier(.4,0,.2,1); }
//       `}</style>

//       <div style={{ maxWidth: 760, margin: "0 auto" }}>
//         {/* Header */}
//         <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
//           <p style={{ fontSize: "0.8rem", letterSpacing: "0.25em", color: "#a78bfa", textTransform: "uppercase", marginBottom: "0.5rem", fontFamily: "'DM Sans'" }}>
//             Application RH — Sprint Board
//           </p>
//           <h1 style={{ fontFamily: "'Syne'", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, background: "linear-gradient(90deg, #c084fc, #818cf8, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
//             Backlog des Tâches
//           </h1>
//         </div>

//         {/* Progress */}
//         <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 16, padding: "1.25rem 1.5rem", marginBottom: "1.5rem", border: "1px solid rgba(255,255,255,0.08)" }}>
//           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
//             <span style={{ fontFamily: "'DM Sans'", fontSize: "0.9rem", color: "#c4b5fd" }}>Progression globale</span>
//             <span style={{ fontFamily: "'Syne'", fontWeight: 700, fontSize: "1.5rem", color: "#a78bfa" }}>{progress}%</span>
//           </div>
//           <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 99, height: 8, overflow: "hidden" }}>
//             <div className="progress-bar" style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #818cf8, #c084fc)", borderRadius: 99 }} />
//           </div>
//           <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.75rem" }}>
//             <span style={{ fontFamily: "'DM Sans'", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>✅ {doneTasks} terminées</span>
//             <span style={{ fontFamily: "'DM Sans'", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>⏳ {totalTasks - doneTasks} restantes</span>
//             <span style={{ fontFamily: "'DM Sans'", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>📋 {totalTasks} total</span>
//           </div>
//         </div>

//         {/* Filter */}
//         <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
//           {[["all", "Toutes"], ["todo", "À faire"], ["done", "Terminées"]].map(([val, label]) => (
//             <button key={val} className="pill" onClick={() => setFilter(val)} style={{
//               padding: "0.4rem 1rem", borderRadius: 99, border: "none", cursor: "pointer", fontFamily: "'DM Sans'", fontSize: "0.82rem", fontWeight: 500,
//               background: filter === val ? "linear-gradient(90deg, #818cf8, #c084fc)" : "rgba(255,255,255,0.08)",
//               color: filter === val ? "#fff" : "rgba(255,255,255,0.5)",
//             }}>{label}</button>
//           ))}
//         </div>

//         {/* Categories */}
//         <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
//           {filteredCategories.map((cat, ci) => {
//             const catDone = cat.tasks.filter(t => t.done).length;
//             return (
//               <div key={cat.id} className="cat-block" style={{ animationDelay: `${ci * 0.08}s`, background: "rgba(255,255,255,0.04)", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
//                 {/* Category header */}
//                 <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", background: `linear-gradient(90deg, ${cat.color}18, transparent)` }}>
//                   <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
//                     <div style={{ width: 10, height: 10, borderRadius: "50%", background: cat.color, boxShadow: `0 0 8px ${cat.color}` }} />
//                     <span style={{ fontFamily: "'Syne'", fontWeight: 700, fontSize: "1rem", color: "#f1f5f9" }}>{cat.category}</span>
//                   </div>
//                   <span style={{ fontFamily: "'DM Sans'", fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.07)", padding: "2px 10px", borderRadius: 99 }}>
//                     {catDone}/{cat.tasks.length}
//                   </span>
//                 </div>

//                 {/* Tasks */}
//                 <div style={{ padding: "0.5rem" }}>
//                   {cat.tasks.map(task => {
//                     const p = priorityConfig[task.priority];
//                     return (
//                       <div key={task.id} className="task-card" onClick={() => toggleTask(cat.id, task.id)} style={{
//                         display: "flex", alignItems: "flex-start", gap: "0.75rem",
//                         padding: "0.75rem 0.75rem",
//                         borderRadius: 12,
//                         background: task.done ? "rgba(255,255,255,0.03)" : "transparent",
//                         marginBottom: "2px",
//                         opacity: task.done ? 0.55 : 1,
//                       }}>
//                         {/* Checkbox */}
//                         <div style={{
//                           width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
//                           border: task.done ? `2px solid ${cat.color}` : "2px solid rgba(255,255,255,0.2)",
//                           background: task.done ? cat.color : "transparent",
//                           display: "flex", alignItems: "center", justifyContent: "center",
//                           transition: "all 0.2s"
//                         }}>
//                           {task.done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
//                         </div>

//                         {/* Text */}
//                         <div style={{ flex: 1 }}>
//                           <p style={{
//                             fontFamily: "'DM Sans'", fontSize: "0.88rem", color: task.done ? "rgba(255,255,255,0.4)" : "#e2e8f0",
//                             textDecoration: task.done ? "line-through" : "none", lineHeight: 1.5,
//                           }}>{task.text}</p>
//                         </div>

//                         {/* Priority badge */}
//                         <span style={{
//                           flexShrink: 0, fontSize: "0.68rem", fontFamily: "'DM Sans'", fontWeight: 600,
//                           background: p.bg, color: p.text, padding: "2px 8px", borderRadius: 99,
//                           display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap"
//                         }}>
//                           <span style={{ width: 5, height: 5, borderRadius: "50%", background: p.dot, display: "inline-block" }} />
//                           {p.label}
//                         </span>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             );
//           })}
//         </div>

//         {/* Footer */}
//         <p style={{ textAlign: "center", marginTop: "2rem", fontFamily: "'DM Sans'", fontSize: "0.75rem", color: "rgba(255,255,255,0.2)" }}>
//           Cliquez sur une tâche pour la marquer comme terminée
//         </p>
//       </div>
//     </div>
//   );
// }
