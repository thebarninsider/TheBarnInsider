import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MapPin, Flag, MessageSquareReply } from 'lucide-react';
import { getBarn, getBarnReviews, flagReview, submitEmployerResponse } from '../services/api.js';
import { useApp } from '../context/AppContext.jsx';

export default function BarnProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const [barn, setBarn] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null);
  const [mode, setMode] = useState('flag');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    reason: 'false_factual_statement',
    challengedText: '',
    details: '',
    response: '',
  });

  useEffect(() => {
    setError('');
    Promise.all([getBarn(id), getBarnReviews(id)])
      .then(([barnData, reviewData]) => {
        setBarn(barnData);
        setReviews(reviewData);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <section className="page container"><div className="error">{error}</div></section>;
  if (!barn) return <section className="page container"><div className="empty">Loading profile…</div></section>;

  const average = reviews.length
    ? (reviews.reduce((sum, review) => sum + review.rating_overall, 0) / reviews.length).toFixed(1)
    : '—';

  const categoryAverages = reviews.length ? {
    pay: (reviews.reduce((sum, review) => sum + Number(review.rating_pay || 0), 0) / reviews.length).toFixed(1),
    management: (reviews.reduce((sum, review) => sum + Number(review.rating_management || 0), 0) / reviews.length).toFixed(1),
    workLife: (reviews.reduce((sum, review) => sum + Number(review.rating_work_life || 0), 0) / reviews.length).toFixed(1),
    horseCare: (reviews.reduce((sum, review) => sum + Number(review.rating_horse_care || 0), 0) / reviews.length).toFixed(1),
  } : null;

  const wouldReturn = reviews.filter((review) => review.would_work_again !== null && review.would_work_again !== undefined);
  const wouldReturnPercent = wouldReturn.length
    ? Math.round((wouldReturn.filter((review) => review.would_work_again).length / wouldReturn.length) * 100)
    : null;

  const requireLogin = () => {
    if (currentUser) return true;
    navigate('/login', { state: { from: `/barn/${barn.id}` } });
    return false;
  };

  const report = async (review) => {
    if (!requireLogin()) return;
    if (form.details.trim().length < 30) {
      setError('Please explain the report in at least 30 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await flagReview(review.id, form);
      setActive(null);
      setForm((current) => ({ ...current, challengedText: '', details: '' }));
      window.alert('Report submitted. A report does not automatically remove a review.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const respond = async (review) => {
    if (!requireLogin()) return;
    if (form.response.trim().length < 30) {
      setError('Employer responses must contain at least 30 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await submitEmployerResponse(review.id, barn.id, form.response.trim());
      setActive(null);
      setForm((current) => ({ ...current, response: '' }));
      window.alert('Response submitted for moderation.');
    } catch (err) {
      setError(
        err.message.includes('row-level security')
          ? 'Only an approved representative of this barn may submit an employer response.'
          : err.message
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section
        className="profile-hero"
        style={{
          backgroundImage: `url(${barn.profile_image_url || 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1600&q=88'})`,
        }}
      >
        <div>
          <span className="eyebrow light">Employer profile</span>
          <h1>{barn.name}</h1>
          <p><MapPin />{[barn.location_city, barn.location_state].filter(Boolean).join(', ')} · {barn.discipline}</p>
        </div>
      </section>

      <section className="container profile-grid">
        <aside className="sidebar">
  <div className="profile-stat-grid">
  <div className="profile-stat">
    <span className="profile-stat-label">
      Average Rating
    </span>

    <div className="profile-rating-line">
      <span className="profile-stars">
        {"★".repeat(Math.round(Number(average) || 0))}
        {"☆".repeat(5 - Math.round(Number(average) || 0))}
      </span>

      <strong>
        {average === "—" ? "—" : `${average} / 5`}
      </strong>
    </div>
  </div>

  <div className="profile-stat">
    <span className="profile-stat-label">
      Total Reviews
    </span>

    <strong className="review-count">
      {reviews.length}
    </strong>

    <small>
      {reviews.length === 1
        ? "published review"
        : "published reviews"}
    </small>
  </div>
</div>

  <span className="badge">
    {barn.is_claimed ? "Claimed profile" : "Unclaimed profile"}
  </span>

  <Link className="btn btn-dark full" to="/submit-review">
    Share your experience
  </Link>

  <Link
    className="btn btn-light full"
    to={`/claim-profile?barn=${barn.id}`}
  >
    Claim this profile
  </Link>
</aside>

        <main className="profile-main">
          {error && <div className="error">{error}</div>}
          <section className="content-card">
            <span className="eyebrow">Workplace snapshot</span>
            <h2>What employees report</h2>
            {categoryAverages ? <div className="barn-summary-grid">
              <div><b>{categoryAverages.pay}</b><span>Pay & benefits</span></div>
              <div><b>{categoryAverages.management}</b><span>Management</span></div>
              <div><b>{categoryAverages.workLife}</b><span>Work-life balance</span></div>
              <div><b>{categoryAverages.horseCare}</b><span>Horse care</span></div>
              {wouldReturnPercent !== null && <div><b>{wouldReturnPercent}%</b><span>Would work here again</span></div>}
            </div> : <p className="muted top">No published ratings are available yet.</p>}
          </section>

          <section className="content-card">
            <h2>Employee reviews</h2>
            <div className="list top">
              {reviews.map((review) => (
                <article className="review-detail" key={review.id}>
                  <div className="score-row">
                    <b>{review.rating_overall}/5</b>
                    {review.employment_verified && <span className="pill">Employment verified</span>}
                  </div>
                  <p className="eyebrow">{review.job_title} · {review.public_name}</p>
                  <div className="review-meta-full">
                    <span>{review.employment_status?.replaceAll('_', ' ')}</span>
                    <span>
  {{
    under_3_months: 'Under 3 months',
    '3_6_months': '3–6 months',
    '6_12_months': '6–12 months',
    '1_2_years': '1–2 years',
    '2_5_years': '2–5 years',
    '5_plus_years': '5+ years',
  }[review.tenure] || review.tenure}
</span>
                    <span>{review.average_weekly_hours} hrs/week</span>
                    <span>{review.currency} {review.pay_amount}/{review.pay_basis}</span>
                    <span>{review.housing_arrangement?.replaceAll('_', ' ')}</span>
                    {review.would_work_again !== null && review.would_work_again !== undefined && <span>{review.would_work_again ? 'Would work here again' : 'Would not work here again'}</span>}
                  </div>
                  <div className="rating-summary public-rating-summary">
                    {[['Overall',review.rating_overall],['Pay',review.rating_pay],['Management',review.rating_management],['Work-life',review.rating_work_life],['Horse care',review.rating_horse_care],['Safety',review.rating_safety],['Growth',review.rating_growth],['Housing',review.rating_housing]].map(([label,value])=><div key={label}><b>{value ?? 'N/A'}</b><span>{label}</span></div>)}
                  </div>
                  <h3>{review.headline}</h3>
                  <p>{review.experience}</p>
                  {review.positives && <div className="sub"><b>What worked well</b><p>{review.positives}</p></div>}
                  {review.improvements && <div className="sub"><b>What could improve</b><p>{review.improvements}</p></div>}
                  {review.employer_responses
                    ?.filter((response) => response.status === 'published')
                    .map((response) => (
                      <div className="employer-response" key={response.id}>
                        <b>Official employer response</b>
                        <p>{response.response_body}</p>
                      </div>
                    ))}

                  <div className="actions">
                    <button type="button" className="link-btn" onClick={() => { setActive(review.id); setMode('flag'); setError(''); }}>
                      <Flag />Report specific content
                    </button>
                    <button type="button" className="link-btn" onClick={() => { setActive(review.id); setMode('response'); setError(''); }}>
                      <MessageSquareReply />Employer response
                    </button>
                  </div>

                  {active === review.id && mode === 'flag' && (
                    <div className="inline-form">
                      <label>Reason
                        <select value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })}>
                          <option value="reviewer_never_worked_here">Reviewer did not work here</option>
                          <option value="false_factual_statement">False factual statement</option>
                          <option value="private_information">Private information</option>
                          <option value="threats_or_harassment">Threats or harassment</option>
                          <option value="confidential_information">Confidential information</option>
                          <option value="conflict_or_manipulation">Conflict or manipulation</option>
                          <option value="other_policy_violation">Other policy violation</option>
                        </select>
                      </label>
                      <label>Exact challenged words
                        <input value={form.challengedText} onChange={(event) => setForm({ ...form, challengedText: event.target.value })} />
                      </label>
                      <label>Specific explanation
                        <textarea rows="5" value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} />
                      </label>
                      <button type="button" disabled={busy} className="btn btn-dark" onClick={() => report(review)}>
                        {busy ? 'Submitting…' : 'Submit report'}
                      </button>
                    </div>
                  )}

                  {active === review.id && mode === 'response' && (
                    <div className="inline-form">
                      <p>Only an approved representative of this barn can submit a response.</p>
                      <label>Professional response
                        <textarea rows="6" value={form.response} onChange={(event) => setForm({ ...form, response: event.target.value })} />
                      </label>
                      <button type="button" disabled={busy} className="btn btn-dark" onClick={() => respond(review)}>
                        {busy ? 'Submitting…' : 'Submit for moderation'}
                      </button>
                    </div>
                  )}
                </article>
              ))}
              {!reviews.length && <div className="empty">No published reviews yet.</div>}
            </div>
          </section>
        </main>
      </section>
    </>
  );
}
