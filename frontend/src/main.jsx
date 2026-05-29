
import React, {useEffect, useRef, useState} from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as blazeface from "@tensorflow-models/blazeface";
import "@tensorflow/tfjs";
import {createRoot} from "react-dom/client";
import {PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, ResponsiveContainer, Legend} from "recharts";
import "./style.css";

const API = "http://127.0.0.1:8000";
const WARNING_COOLDOWN_MS = 2500;
const DEPTS = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "AIML", "DS"];

function Login({setUser}) {
  const [role,setRole]=useState("student");
  const [mode,setMode]=useState("login");
  const [form,setForm]=useState({username:"",password:"",full_name:"",roll_number:"",department:"CSE",email:"",year:"3rd Year"});
  const [msg,setMsg]=useState("");
  const update = (k,v)=>setForm({...form,[k]:v});

  async function submit(){
    if(!form.username.trim() || !form.password){ setMsg("Enter username and password"); return; }
    setMsg("Checking login...");
    const payload = {username:form.username.trim(),password:form.password,role,roll_number:form.roll_number,department:form.department};
    const res = await fetch(`${API}/login`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)});
    const data = await res.json();
    if(res.ok){ setUser(data); }
    else setMsg(data.detail || "Login failed");
  }

  async function register(){
    const nameRegex = /^[A-Za-z ]{3,30}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const rollRegex = /^[0-9A-Za-z]{5,15}$/;

    const fullName = form.full_name.trim();
    const email = form.email.trim();
    const username = form.username.trim();
    const rollNumber = form.roll_number.trim().toUpperCase();

    if(!nameRegex.test(fullName)){ setMsg("Invalid name. Use only letters, minimum 3 characters."); return; }
    if(!emailRegex.test(email)){ setMsg("Invalid email. Example: suppu80@gmail.com"); return; }
    if(username.length < 4){ setMsg("Username must be minimum 4 characters."); return; }
    if(form.password.length < 6){ setMsg("Password must be minimum 6 characters."); return; }
    if(!rollRegex.test(rollNumber)){ setMsg("Invalid roll number. Example: 236Y1A05A7"); return; }
    if(!form.department){ setMsg("Please select department."); return; }
    if(!form.year){ setMsg("Please select year."); return; }

    const res = await fetch(`${API}/register`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({...form, full_name:fullName, email, username, roll_number:rollNumber})
    });
    const data = await res.json();
    setMsg(data.message || data.detail);
    if(res.ok) setMode("login");
  }

  return <div className="auth-page">
    <div className="auth-left">
      <div className="glass-card hero-card">
        <span className="pill">AI + ML Proctoring</span>
        <h1>Exam Malpractice Detection</h1>
        <p>Secure MCQ exam system with hidden monitoring, warning evidence, risk score, admin graphs and ML model training.</p>
        <div className="hero-stats"><b>Live Exam</b><b>Evidence Capture</b><b>Admin Analytics</b></div>
      </div>
    </div>
    <div className="auth-right">
      <div className="card auth-card">
        <h2>{mode==="login"?"Login":"Student Registration"}</h2>
        <div className="role-tabs">
          <button className={role==="student"?"active":""} onClick={()=>setRole("student")}>Student</button>
          <button className={role==="admin"?"active":""} onClick={()=>{setRole("admin"); setMode("login"); setMsg("");}}>Admin</button>
        </div>
        {mode==="register" && role==="student" && <>
          <input placeholder="Full Name (letters only)" value={form.full_name} onChange={e=>update("full_name",e.target.value)} />
          <input placeholder="Email example: suppu80@gmail.com" value={form.email} onChange={e=>update("email",e.target.value)} />
        </>}
        <input placeholder="Username" value={form.username} onChange={e=>update("username",e.target.value)} />
        <input placeholder="Password" type="password" value={form.password} onChange={e=>update("password",e.target.value)} />
        {role==="student" && <>
          <input placeholder="Roll Number example: 236Y1A05A7" value={form.roll_number} onChange={e=>update("roll_number",e.target.value)} />
          <select value={form.department} onChange={e=>update("department",e.target.value)}>{DEPTS.map(d=><option key={d}>{d}</option>)}</select>
          {mode==="register" && <select value={form.year} onChange={e=>update("year",e.target.value)}><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select>}
        </>}
        <button className="primary full" onClick={mode==="login"?submit:register}>{mode==="login"?"Login":"Create Student Account"}</button>
        {role==="student" && <button className="link-btn" onClick={()=>{setMode(mode==="login"?"register":"login"); setMsg("")}}>{mode==="login"?"New student? Register here":"Already registered? Login"}</button>}
        <p className={msg.includes("success") ? "message success-msg":"message"}>{msg}</p>
      </div>
    </div>
  </div>
}

function HiddenMonitoring({onWarning, onStreamReady}) {
  const videoRef = useRef(null), canvasRef = useRef(null), streamRef = useRef(null);
  const lastWarnRef = useRef({});
  const baselineRef = useRef({cx:null, cy:null, ready:false, samples:[]});
  const blazeRef = useRef(null), cocoRef = useRef(null);
  const lastActivity = useRef(Date.now());
  const audioBaselineRef = useRef({ready:false, samples:[], value:0});

  function canWarn(type, cooldown=WARNING_COOLDOWN_MS){
    const now=Date.now();
    if(lastWarnRef.current[type] && now-lastWarnRef.current[type] < cooldown) return false;
    lastWarnRef.current[type]=now; return true;
  }
  function captureScreenshot(reason){
    const video=videoRef.current, canvas=canvasRef.current;
    if(!video || !canvas || !video.videoWidth) return "";
    canvas.width=video.videoWidth; canvas.height=video.videoHeight;
    const ctx=canvas.getContext("2d");
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    ctx.fillStyle="rgba(220,38,38,.88)"; ctx.fillRect(0,0,canvas.width,42);
    ctx.fillStyle="white"; ctx.font="18px Arial";
    ctx.fillText(`Evidence: ${reason} | ${new Date().toLocaleTimeString()}`,10,27);
    return canvas.toDataURL("image/jpeg",0.86);
  }
  function trigger(type, reason, cooldown=WARNING_COOLDOWN_MS){
    if(!canWarn(type,cooldown)) return;
    onWarning({type,reason,image:captureScreenshot(reason),time:new Date().toLocaleTimeString()});
  }

  useEffect(()=>{
    let cancelled=false;
    blazeface.load().then(m=>blazeRef.current=m).catch(()=>{});
    cocoSsd.load().then(m=>cocoRef.current=m).catch(()=>{});
    navigator.mediaDevices?.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:"user"},audio:{echoCancellation:true,noiseSuppression:false,autoGainControl:false}})
      .then(stream=>{ if(cancelled) return; streamRef.current=stream; if(videoRef.current) videoRef.current.srcObject=stream; onStreamReady?.(stream); setupAudio(stream);})
      .catch(()=>trigger("camera","Camera or microphone permission denied",1000));

    function markActivity(){lastActivity.current=Date.now();}
    ["mousemove","keydown","click","scroll","touchstart"].forEach(ev=>window.addEventListener(ev,markActivity));
    const blur=()=>trigger("tab","Tab switch or browser minimized");
    const visibility=()=>{if(document.hidden) trigger("tab","Student left exam tab");};
    const copy=e=>{e.preventDefault(); trigger("copy","Copy / paste / cut attempt detected");};
    window.addEventListener("blur",blur); document.addEventListener("visibilitychange",visibility);
    document.addEventListener("copy",copy); document.addEventListener("paste",copy); document.addEventListener("cut",copy);

    const inactive=setInterval(()=>{ if(Date.now()-lastActivity.current>45000){trigger("inactive","Student inactive for 45 seconds"); lastActivity.current=Date.now();}},5000);

    const timer=setInterval(async()=>{
      const video=videoRef.current; if(!video || !video.videoWidth) return;
      if(blazeRef.current){
        try{
          const faces=await blazeRef.current.estimateFaces(video,false);
          if(faces.length===0) trigger("face_missing","Face not visible / moved away");
          if(faces.length>1) trigger("multiple_faces",`Multiple faces detected (${faces.length})`);
          if(faces.length===1){
            const tl=faces[0].topLeft, br=faces[0].bottomRight;
            const cx=(tl[0]+br[0])/2, cy=(tl[1]+br[1])/2, b=baselineRef.current;
            if(!b.ready){ b.samples.push({cx,cy}); if(b.samples.length>=10){b.cx=b.samples.reduce((a,x)=>a+x.cx,0)/10; b.cy=b.samples.reduce((a,x)=>a+x.cy,0)/10; b.ready=true;} }
            else if(Math.abs(cx-b.cx)/video.videoWidth>.13 || Math.abs(cy-b.cy)/video.videoHeight>.12) trigger("head","Head turned / looking away from screen");
          }
        }catch(e){}
      }
      if(cocoRef.current){
        try{
          const preds=await cocoRef.current.detect(video);
          const persons=preds.filter(p=>p.class==="person" && p.score>.45);
          const phones=preds.filter(p=>["cell phone","remote","book"].includes(p.class) && p.score>.35);
          if(persons.length>1) trigger("multiple_faces",`Another person detected (${persons.length} persons)`);
          if(phones.length>0) trigger("phone",`Mobile phone/object detected: ${phones[0].class}`);
        }catch(e){}
      }
    },1300);

    function setupAudio(stream){
      try{
        const AC=window.AudioContext||window.webkitAudioContext, ctx=new AC(), analyser=ctx.createAnalyser(), mic=ctx.createMediaStreamSource(stream);
        analyser.fftSize=1024; mic.connect(analyser);
        const data=new Uint8Array(analyser.frequencyBinCount);
        setInterval(()=>{ analyser.getByteFrequencyData(data); const avg=data.reduce((a,b)=>a+b,0)/data.length; const b=audioBaselineRef.current;
          if(!b.ready){b.samples.push(avg); if(b.samples.length>=12){b.value=b.samples.reduce((a,x)=>a+x,0)/12; b.ready=true;} return;}
          if(avg>Math.max(b.value+22,38)) trigger("noise",`High voice/noise detected (level ${Math.round(avg)})`,3500);
        },900);
      }catch(e){}
    }

    return ()=>{cancelled=true; clearInterval(timer); clearInterval(inactive); streamRef.current?.getTracks().forEach(t=>t.stop());};
  },[]);
  return <><video ref={videoRef} autoPlay muted playsInline className="hidden-camera"/><canvas ref={canvasRef} className="hidden-camera"/></>;
}

function StudentExam({user,setUser}) {
  const [exams,setExams]=useState([]), [exam,setExam]=useState(null), [answers,setAnswers]=useState({}), [time,setTime]=useState(0);
  const [submitted,setSubmitted]=useState(false), [studentWarning,setStudentWarning]=useState(null), [submitReason,setSubmitReason]=useState("Manual Submit");
  const recorderRef=useRef(null), chunksRef=useRef([]), evidenceRef=useRef([]), submitLock=useRef(false);
  const statsRef=useRef({warnings:0,phone_detected:0,multiple_faces:0,face_missing:0,tab_switches:0,noise_alerts:0,head_movements:0,copy_paste_attempts:0,inactivity_alerts:0});
  useEffect(()=>{fetch(`${API}/exams`).then(r=>r.json()).then(setExams).catch(()=>setExams([]));},[]);
  function openExam(ex){setExam(ex); setTime((ex.duration_minutes||20)*60); setAnswers({}); setSubmitted(false); evidenceRef.current=[]; submitLock.current=false; statsRef.current={warnings:0,phone_detected:0,multiple_faces:0,face_missing:0,tab_switches:0,noise_alerts:0,head_movements:0,copy_paste_attempts:0,inactivity_alerts:0};}
  useEffect(()=>{ if(!exam||submitted)return; const t=setInterval(()=>setTime(x=>{if(x<=1){clearInterval(t); submitExam("Time completed - exam auto submitted"); return 0;} return x-1;}),1000); return()=>clearInterval(t);},[exam,submitted]);
  function startRecording(stream){try{const rec=new MediaRecorder(stream,{mimeType:"video/webm"}); chunksRef.current=[]; rec.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data)}; rec.start(1000); recorderRef.current=rec;}catch(e){}}
  function warning(item){const map={phone:"phone_detected",multiple_faces:"multiple_faces",face_missing:"face_missing",tab:"tab_switches",noise:"noise_alerts",head:"head_movements",copy:"copy_paste_attempts",inactive:"inactivity_alerts",camera:"face_missing"}; const key=map[item.type]; const max=exam?.questions?.length>30?5:3; const next=statsRef.current.warnings+1; statsRef.current={...statsRef.current,warnings:next,...(key?{[key]:statsRef.current[key]+1}:{})}; const w={...item,count:next}; evidenceRef.current=[...evidenceRef.current,w].slice(-30); setStudentWarning(w); setTimeout(()=>setStudentWarning(null),4200); if(next>=max)setTimeout(()=>submitExam(`Auto submitted because ${max} warnings reached. Last reason: ${item.reason}`),900);}
  async function stopRecorder(){return new Promise(resolve=>{const rec=recorderRef.current; if(!rec||rec.state==="inactive")return resolve(""); rec.onstop=()=>{const blob=new Blob(chunksRef.current,{type:"video/webm"}); const reader=new FileReader(); reader.onloadend=()=>resolve(reader.result); reader.readAsDataURL(blob);}; rec.stop();});}
  async function submitExam(reason="Manual Submit"){if(submitLock.current||!exam)return; submitLock.current=true; setSubmitted(true); setSubmitReason(reason); let score=0; exam.questions.forEach((q,i)=>{if(answers[i]===q.answer)score++;}); const recData=await stopRecorder(); await fetch(`${API}/submit-report`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:user.username,roll_number:user.roll_number||"",department:user.department||"",exam_id:exam.id,exam_title:exam.title,score,total_questions:exam.questions.length,submit_reason:reason,last_warning_reason:evidenceRef.current.length?evidenceRef.current[evidenceRef.current.length-1].reason:"No warning",warning_limit:exam.questions.length>30?5:3,warning_timeline:evidenceRef.current.map(e=>`${e.time} - ${e.reason}`),...statsRef.current,screenshots:evidenceRef.current,recording:recData||""})});}
  if(!exam)return <div className="exam-bg"><div className="container"><div className="card top exam-header"><div><span className="pill">Welcome {user.full_name||user.username}</span><h1>Available Tests</h1><p>Select a test to start. Monitoring starts only after test opens.</p></div><button className="secondary" onClick={()=>setUser(null)}>Logout</button></div><div className="test-grid">{exams.map(ex=><div className="card test-card" key={ex.id}><span className="pill">Test ID: {ex.id}</span><h2>{ex.title}</h2><p><b>Duration:</b> {ex.duration_minutes} minutes</p><p><b>Questions:</b> {ex.questions?.length||0}</p><button className="primary" onClick={()=>openExam(ex)}>Start This Test</button></div>)}</div></div></div>;
  if(submitted)return <div className="container"><div className="card success"><h2>Exam Submitted Successfully</h2><p><b>Reason:</b> {submitReason}</p><button onClick={()=>setUser(null)}>Logout</button></div></div>;
  return <div className="exam-bg"><HiddenMonitoring onWarning={warning} onStreamReady={startRecording}/><div className="container"><div className="card top exam-header"><div><span className="pill">Roll: {user.roll_number||"-"} • {user.department||"-"}</span><h1>{exam.title}</h1><p><b>Warning Limit:</b> {exam.questions.length>30?5:3} chances based on question count.</p></div><div className="timer">{String(Math.floor(time/60)).padStart(2,"0")}:{String(time%60).padStart(2,"0")}</div></div>{studentWarning&&<div className="warning-toast strong-warning"><b>Warning {studentWarning.count}/{exam.questions.length>30?5:3}</b><br/>{studentWarning.reason}<br/><small>Screenshot evidence captured for admin.</small></div>}{exam.questions.map((q,i)=><div className="card question-card" key={i}><h3>{i+1}. {q.question}</h3>{q.options.map(opt=><label className="option" key={opt}><input type="radio" name={`q${i}`} value={opt} onChange={()=>setAnswers({...answers,[i]:opt})}/> {opt}</label>)}</div>)}<button className="danger submit-btn" onClick={()=>submitExam("Student submitted manually")}>Submit Exam</button></div></div>;
}

function Admin({setUser}) {
  const [tab,setTab]=useState("dashboard"), [reports,setReports]=useState([]), [summary,setSummary]=useState({});
  const [title,setTitle]=useState("Real Time MCQ Examination"), [duration,setDuration]=useState(20);
  const [evidencePass,setEvidencePass]=useState(""), [evidenceUnlocked,setEvidenceUnlocked]=useState(false);
  const [raw,setRaw]=useState(`What is Machine Learning?|Training computers to learn from data|Only typing code|Creating hardware|Deleting files|Training computers to learn from data
Which model is used for classification?|Random Forest|K-Means|PCA|Apriori|Random Forest
What does DBMS mean?|Database Management System|Data Backup Main Software|Digital Base Memory Service|None|Database Management System`);
  function load(){fetch(`${API}/admin/reports`).then(r=>r.json()).then(setReports); fetch(`${API}/admin/summary`).then(r=>r.json()).then(setSummary);}
  useEffect(()=>{load()},[]);
  async function unlockEvidence(){const res=await fetch(`${API}/admin/evidence-password`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:evidencePass})}); if(res.ok)setEvidenceUnlocked(true); else alert("Wrong evidence password");}
  function evidenceUrl(url){return `${API}/admin/evidence-file?path=${encodeURIComponent(url)}&password=${encodeURIComponent(evidencePass)}`;}
  async function createExam(){const questions=raw.split("\n").filter(Boolean).map(line=>{const p=line.split("|").map(x=>x.trim()); return {question:p[0],options:p.slice(1,5),answer:p[5]};}).filter(q=>q.question&&q.options.length===4&&q.answer); if(!questions.length){alert("Paste valid MCQs first");return;} await fetch(`${API}/admin/exams`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,duration_minutes:Number(duration),questions})}); alert("Exam generated successfully");}
  const pieData=[{name:"Normal",value:summary.normal_students||0},{name:"Suspicious",value:summary.suspicious_students||0}];
  const detectionData=[{name:"Phone",value:reports.reduce((a,r)=>a+(r.phone_detected||0),0)},{name:"Tab",value:reports.reduce((a,r)=>a+(r.tab_switches||0),0)},{name:"Faces",value:reports.reduce((a,r)=>a+(r.multiple_faces||0),0)},{name:"Noise",value:reports.reduce((a,r)=>a+(r.noise_alerts||0),0)},{name:"Head",value:reports.reduce((a,r)=>a+(r.head_movements||0),0)}];
  return <div className="admin-bg"><div className="container"><div className="card top admin-header"><div><span className="pill">Admin Control Center</span><h1>Exam Malpractice Detection</h1></div><div><button onClick={()=>{setTab("dashboard");load();}}>Dashboard</button><button onClick={()=>setTab("create")}>Create Exam</button><button className="secondary" onClick={()=>setUser(null)}>Logout</button></div></div>{tab==="create"&&<div className="card"><h2>Create / Generate MCQ Test</h2><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Exam title"/><input type="number" value={duration} onChange={e=>setDuration(e.target.value)} placeholder="Duration"/><b>Question | Option1 | Option2 | Option3 | Option4 | CorrectAnswer</b><textarea rows="14" className="mcq-box" value={raw} onChange={e=>setRaw(e.target.value)} /><button onClick={createExam}>Generate Test</button></div>}{tab==="dashboard"&&<><div className="grid cards-row"><div className="metric blue"><h3>Total Reports</h3><h1>{summary.total_reports||0}</h1></div><div className="metric green"><h3>Normal</h3><h1>{summary.normal_students||0}</h1></div><div className="metric red"><h3>Suspicious</h3><h1>{summary.suspicious_students||0}</h1></div><div className="metric purple"><h3>Evidence Files</h3><h1>{summary.evidence_count||0}</h1></div></div><div className="grid charts-grid"><div className="card"><h3>Normal vs Suspicious</h3><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label><Cell fill="#22c55e"/><Cell fill="#ef4444"/></Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></div><div className="card"><h3>Detection Counts</h3><ResponsiveContainer width="100%" height={260}><BarChart data={detectionData}><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#2563eb"/></BarChart></ResponsiveContainer></div></div><div className="card"><h2>Student Reports + Evidence</h2><div className="evidence-lock"><b>Evidence Password:</b><input type="password" placeholder="Enter evidence password" value={evidencePass} onChange={e=>setEvidencePass(e.target.value)} /><button onClick={unlockEvidence}>{evidenceUnlocked?"Evidence Unlocked":"Unlock Evidence"}</button><small>Enter password to unlock screenshot/video evidence.</small></div><a href={`${API}/admin/export-csv`}><button>Download CSV</button></a><div className="table-wrap"><table><thead><tr><th>Student</th><th>Roll</th><th>Dept</th><th>Test</th><th>Score</th><th>Warnings</th><th>Risk</th><th>Status</th><th>Submitted Time</th><th>Why Submitted?</th><th>Warning Timeline</th><th>Screenshots</th><th>Recording</th></tr></thead><tbody>{reports.map(r=><tr key={r.id}><td>{r.username}</td><td>{r.roll_number}</td><td>{r.department}</td><td>{r.exam_title||r.exam_id}</td><td>{r.score}/{r.total_questions}</td><td>{r.warnings}</td><td>{r.risk_score}%</td><td><span className={`badge ${r.status==="Normal"?"ok":"risk"}`}>{r.status}</span></td><td>{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "-"}</td><td className="reason-cell">{r.admin_analysis_reason||r.submit_reason||"-"}</td><td className="reason-cell">{(r.warning_timeline||[]).slice(0,6).map((x,i)=><div key={i}>• {x}</div>)}</td><td><div className="evidence-list">{!evidenceUnlocked?<span className="locked">Locked</span>:(r.evidence_screenshots||[]).slice(0,6).map((s,i)=><a key={i} href={evidenceUrl(s.url)} target="_blank"><img src={evidenceUrl(s.url)} title={s.reason}/><small>{s.time || ""}<br/>{s.reason}</small></a>)}</div></td><td>{r.recording_url?(evidenceUnlocked?<a href={evidenceUrl(r.recording_url)} target="_blank"><button className="small-btn">View Video</button></a>:<span className="locked">Locked</span>):"-"}</td></tr>)}</tbody></table></div></div></>}</div></div>;
}

function App(){const [user,setUser]=useState(null); if(!user)return <Login setUser={setUser}/>; if(user.role==="admin")return <Admin setUser={setUser}/>; return <StudentExam user={user} setUser={setUser}/>;}
createRoot(document.getElementById("root")).render(<App/>);
