import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Edit3, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import {
  getMyReviews,
  getMyClaims,
  getNotifications,
  getOpenProofRequests,
  uploadProof,
  markNotificationRead,
  markAllNotificationsRead,
  withdrawOwnReview,
  revokeOwnBarnClaim,
} from '../services/api.js';

export default function Account(){
  const { currentUser, profile, logout } = useApp();
  const navigate = useNavigate();
  const [reviews,setReviews]=useState([]);
  const [claims,setClaims]=useState([]);
  const [notes,setNotes]=useState([]);
  const [proofs,setProofs]=useState([]);
  const [error,setError]=useState('');
  const [uploading,setUploading]=useState('');
  const [busyReview,setBusyReview]=useState('');

  const load=async()=>{
    try{
      const [r,c,n,p]=await Promise.all([
        getMyReviews(currentUser.id),
        getMyClaims(currentUser.id),
        getNotifications(currentUser.id),
        getOpenProofRequests(currentUser.id),
      ]);
      setReviews(r);setClaims(c);setNotes(n);setProofs(p);
    }catch(e){setError(e.message)}
  };

  useEffect(()=>{load()},[currentUser.id]);

  const send=async(req,file)=>{
    if(!file)return;
    setUploading(req.id);
    try{await uploadProof(req,file);await load();window.alert('Proof uploaded securely.')}catch(e){setError(e.message)}finally{setUploading('')}
  };
  const readOne=async id=>{try{await markNotificationRead(id);await load()}catch(e){setError(e.message)}};
  const readAll=async()=>{try{await markAllNotificationsRead(currentUser.id);await load()}catch(e){setError(e.message)}};
  const withdraw=async review=>{
    const confirmed=window.confirm('Delete this review? It will immediately disappear from public view and cannot be restored by you. BarnInsider will retain an internal audit record.');
    if(!confirmed)return;
    setBusyReview(review.id);setError('');
    try{await withdrawOwnReview(review.id);await load();window.alert('Your review was deleted from public view.')}catch(e){setError(e.message)}finally{setBusyReview('')}
  };
    const releaseClaim = async (claim) => {
  const confirmed = window.confirm(
    `Release your claim to ${claim.barn_name}? You will immediately lose employer access for this profile.`
  );

  if (!confirmed) {
    return;
  }

  setError("");

  try {
    await revokeOwnBarnClaim(claim.id);

    setClaims((current) =>
      current.map((item) =>
        item.id === claim.id
          ? { ...item, status: "revoked" }
          : item
      )
    );

    window.alert("The profile claim has been released.");
  } catch (err) {
    setError(err.message);
  }
};

  const editableStatuses=['pending','changes_requested','published','proof_requested'];
  const visibleReviews=reviews.filter(r=>r.status!=='withdrawn');

  return <section className="page container">
    <div className="page-head"><span className="eyebrow">My account</span><h1>{profile?.first_name||'Your'} dashboard</h1><p>Track reviews, proof requests, claims, and notifications.</p></div>
    {error&&<div className="error">{error}</div>}
    <div className="account-grid">
      <aside className="content-card"><h3>Private account</h3><p><b>{profile?.first_name} {profile?.last_name}</b></p><p>{currentUser.email}</p>{profile?.phone&&<p>{profile.phone}</p>}<span className="pill">Never displayed with reviews</span><div className="top"><b>{notes.filter(n=>!n.is_read).length}</b><p>Unread notifications</p></div><div className="account-logout"><button type="button" className="btn btn-light" onClick={async()=>{await logout();navigate('/',{replace:true})}}>Log out</button></div></aside>
      <div>
        <div className="dash-head"><h2>Notifications</h2>{notes.some(n=>!n.is_read)&&<button type="button" className="muted-button" onClick={readAll}>Mark all read</button>}</div>
        <div className="notification-list">{notes.slice(0,8).map(n=><article className={`notification-item ${n.is_read?'':'unread'}`} key={n.id}><b>{n.title}</b><p>{n.message}</p><small>{new Date(n.created_at).toLocaleString()}</small>{!n.is_read&&<button type="button" className="muted-button" onClick={()=>readOne(n.id)}>Mark read</button>}</article>)}{!notes.length&&<p className="muted">No notifications yet.</p>}</div>

        <div className="dash-head top"><h2>My reviews</h2><Link className="btn btn-dark" to="/submit-review">Share an experience</Link></div>
        <div className="list">
          {visibleReviews.map(review=><article className="content-card" key={review.id}>
            <div className="score-row"><h3>{review.barns?.name}</h3><span className={`status ${review.status}`}>{review.status.replaceAll('_',' ')}</span></div>
            <small>{review.job_title} · {new Date(review.submitted_at).toLocaleDateString()}</small>
            <h3>{review.headline}</h3><p>{review.experience}</p>
            <div className="chips"><span>{review.average_weekly_hours} hrs/week</span><span>{review.currency} {review.pay_amount}/{review.pay_basis}</span><span>{review.employment_status.replaceAll('_',' ')}</span></div>
            {review.moderator_note&&<div className="notice"><b>Moderator note</b><p>{review.moderator_note}</p></div>}
            <div className="review-owner-actions">
              {editableStatuses.includes(review.status)&&<Link className="btn btn-light" to={`/edit-review/${review.id}`}><Edit3/>Edit review</Link>}
              <button type="button" disabled={busyReview===review.id} className="btn reject" onClick={()=>withdraw(review)}><Trash2/>{busyReview===review.id?'Deleting…':'Delete review'}</button>
            </div>
            <small>Review ID: {review.id}</small>
          </article>)}
          {!visibleReviews.length&&<div className="empty">No active reviews submitted yet.</div>}
        </div>

        <div className="dash-head top"><h2>Proof requests</h2></div>
        <div className="list">{proofs.map(req=><article className="content-card" key={req.id}><span className="status">{req.status}</span><h3>{req.reviews?.barns?.name}: {req.reviews?.headline}</h3><p>{req.request_message}</p>{req.due_at&&<p><b>Due:</b> {new Date(req.due_at).toLocaleDateString()}</p>}<label>Upload PDF, JPG, PNG, WebP, or TXT<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt" onChange={e=>send(req,e.target.files?.[0])}/></label>{uploading===req.id&&<p>Uploading securely…</p>}</article>)}{!proofs.length&&<p className="muted">No open proof requests.</p>}</div>

        <div className="dash-head top">
  <h2>Employer claims</h2>

  <Link className="btn btn-light" to="/claim-profile">
    Claim a profile
  </Link>
</div>

<div className="list">
  {claims.map((claim) => (
    <article className="content-card" key={claim.id}>
      <div className="score-row">
        <h3>{claim.barn_name}</h3>

        <span className={`status ${claim.status}`}>
          {claim.status.replaceAll("_", " ")}
        </span>
      </div>

      <p>
        {claim.role_title} · {claim.business_email}
      </p>

      {claim.admin_note && <p>{claim.admin_note}</p>}

      {(claim.status === "approved" ||
        claim.status === "pending") && (
        <div className="review-owner-actions">
          <button
            type="button"
            className="btn reject"
            onClick={() => releaseClaim(claim)}
          >
            Release claim
          </button>
        </div>
      )}

      {claim.status === "revoked" && (
        <p className="muted">
          This profile claim has been released.
        </p>
      )}
    </article>
  ))}

  {!claims.length && (
    <p className="muted">No claims submitted.</p>
  )}
</div>
      </div>
    </div>
  </section>
}
