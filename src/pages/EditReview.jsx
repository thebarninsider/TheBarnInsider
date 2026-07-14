import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ClipboardCheck, ShieldCheck } from 'lucide-react';
import Stars from '../components/Stars.jsx';
import { getOwnReview, updateOwnReview } from '../services/api.js';

const fields = [['overall','Overall experience'],['pay','Pay & benefits'],['management','Management'],['housing','Housing, if provided'],['workLife','Work-life balance'],['horseCare','Horse care standards'],['safety','Workplace safety'],['growth','Learning & career growth']];
const employmentMap = { former_employee:'Former employee', current_employee:'Current employee', working_student:'Working student', intern_apprentice:'Intern / apprentice' };
const tenureMap = { under_3_months:'Under 3 months', '3_6_months':'3–6 months', '6_12_months':'6–12 months', '1_2_years':'1–2 years', '2_5_years':'2–5 years', '5_plus_years':'5+ years' };
const housingMap = { not_provided:'Not provided', provided_free:'Provided at no charge', deducted_from_pay:'Provided and deducted from pay', separate_fee:'Provided for a separate fee', promised_not_provided:'Promised but not provided' };

export default function EditReview(){
  const { id } = useParams();
  const nav = useNavigate();
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [ratings,setRatings]=useState(Object.fromEntries(fields.map(([k])=>[k,4])));
  const [form,setForm]=useState(null);
  const update=(key,value)=>setForm(current=>({...current,[key]:value}));

  useEffect(()=>{
    getOwnReview(id).then(review=>{
      setForm({
        barnName:review.barns?.name||'',
        location:[review.barns?.location_city,review.barns?.location_state].filter(Boolean).join(', '),
        discipline:review.barns?.discipline||'Other',
        website:review.barns?.website_url||'',
        role:review.job_title||'',
        employmentStatus:employmentMap[review.employment_status]||'Former employee',
        tenure:tenureMap[review.tenure]||'6–12 months',
        weeklyHours:String(review.average_weekly_hours??''),
        payType:review.pay_basis==='monthly'?'Monthly':'Hourly',
        payAmount:String(review.pay_amount??''),
        currency:review.currency||'USD',
        housing:housingMap[review.housing_arrangement]||'Not provided',
        headline:review.headline||'',
        experience:review.experience||'',
        positives:review.positives||'',
        improvements:review.improvements||'',
        publicDisplay:review.public_display==='full_name'?'Full name':review.public_display==='first_name'?'First name only':'Anonymous',
        contactPermission:review.contact_permission?'Yes':'No',
        proofAvailable:review.proof_available==='yes'?'Yes':review.proof_available==='no'?'No':'Prefer not to say',
        wouldWorkAgain:review.would_work_again===true?'Yes':review.would_work_again===false?'No':'Prefer not to say',
      });
      setRatings({overall:review.rating_overall,pay:review.rating_pay,management:review.rating_management,housing:review.rating_housing||3,workLife:review.rating_work_life,horseCare:review.rating_horse_care,safety:review.rating_safety,growth:review.rating_growth});
    }).catch(err=>setError(err.message)).finally(()=>setLoading(false));
  },[id]);

  const submit=async event=>{
    event.preventDefault();
    if(busy)return;
    setError('');
    if(form.experience.trim().length<120)return setError('Please provide at least 120 characters of firsthand detail.');
    setBusy(true);
    try{
      await updateOwnReview(id,form,ratings);
      window.alert('Your edits were saved and the review has returned to pending moderation.');
      nav('/account');
    }catch(err){setError(err.message)}finally{setBusy(false)}
  };

  if(loading)return <section className="page container narrow"><div className="empty">Loading your review…</div></section>;
  if(!form)return <section className="page container narrow"><div className="error">{error||'Review not found.'}</div></section>;

  return <section className="page container narrow">
    <div className="page-head centered"><span className="eyebrow">Edit your review</span><h1>Update your workplace experience.</h1><p>Every edit returns the review to pending moderation. It will not be public again until an administrator approves the updated version.</p></div>
    <div className="note-grid"><div><ClipboardCheck/><b>Fresh approval required</b><span>All edits are reviewed before publication.</span></div><div><ShieldCheck/><b>Your history is retained</b><span>Moderation records remain available internally.</span></div><div><AlertTriangle/><b>Stay firsthand and factual</b><span>You remain responsible for the updated content.</span></div></div>
    {error&&<div className="error">{error}</div>}
    <form className="form-card review-form" onSubmit={submit}>
      <Section n="1" title="Employer information"><div className="form-grid"><label>
  Employer name
  <input
    required
    value={form.barnName}
    onChange={e => update('barnName', e.target.value)}
    placeholder="ie: Sky Farm, Smith Family Farm, or Jane Smith"
  />
</label><label>City and state/province<input required value={form.location} onChange={e=>update('location',e.target.value)}/></label><label>Primary discipline<select value={form.discipline} onChange={e=>update('discipline',e.target.value)}>{['Hunter/Jumper','Eventing','Dressage','Polo','Racing','Breeding','Western','Boarding / lesson barn','Therapeutic riding','Other'].map(v=><option key={v}>{v}</option>)}</select></label><label>Website or public social page<input value={form.website} onChange={e=>update('website',e.target.value)}/></label></div></Section>
      <Section n="2" title="Your employment"><div className="form-grid"><label>Your role<input required value={form.role} onChange={e=>update('role',e.target.value)}/></label><label>Status<select value={form.employmentStatus} onChange={e=>update('employmentStatus',e.target.value)}>{['Former employee','Current employee','Working student','Intern / apprentice'].map(v=><option key={v}>{v}</option>)}</select></label><label>Tenure<select value={form.tenure} onChange={e=>update('tenure',e.target.value)}>{['Under 3 months','3–6 months','6–12 months','1–2 years','2–5 years','5+ years'].map(v=><option key={v}>{v}</option>)}</select></label><label>Average weekly hours<input required type="number" min="1" max="168" value={form.weeklyHours} onChange={e=>update('weeklyHours',e.target.value)}/></label><label>Pay basis<select value={form.payType} onChange={e=>update('payType',e.target.value)}><option>Hourly</option><option>Monthly</option></select></label><label>{form.payType==='Hourly'?'Hourly pay':'Monthly salary'}<input required type="number" min="0" step=".01" value={form.payAmount} onChange={e=>update('payAmount',e.target.value)}/></label><label>Currency<select value={form.currency} onChange={e=>update('currency',e.target.value)}>{['USD','CAD','GBP','EUR','AUD','Other'].map(v=><option key={v}>{v}</option>)}</select></label><label>Housing<select value={form.housing} onChange={e=>update('housing',e.target.value)}>{['Not provided','Provided at no charge','Provided and deducted from pay','Provided for a separate fee','Promised but not provided'].map(v=><option key={v}>{v}</option>)}</select></label></div></Section>
      <Section n="3" title="Rate the workplace">

  <label className="check">
    <input
      type="checkbox"
      checked={form.housing === "Not provided"}
      onChange={(event) => {
        if (event.target.checked) {
          update("housing", "Not provided");
        } else {
          update("housing", "Provided at no charge");
        }
      }}
    />

    <span>
      Housing was <strong>not provided</strong> by this employer.
    </span>
  </label>

  <div className="rating-grid">
    {fields
      .filter(([key]) => {
        if (
          key === "housing" &&
          form.housing === "Not provided"
        ) {
          return false;
        }

        return true;
      })
      .map(([key, label]) => (
        <label key={key}>
          {label}

          <Stars
            label={label}
            value={ratings[key]}
            onChange={(value) =>
              setRatings((current) => ({
                ...current,
                [key]: value,
              }))
            }
          />
        </label>
      ))}
  </div>

</Section>
      <Section n="4" title="Your firsthand experience"><label>Headline<input minLength="5" required maxLength="100" value={form.headline} onChange={e=>update('headline',e.target.value)}/> <small>
              minimum 5
            </small></label><label>What should future employees know?<textarea required minLength="120" maxLength="5000" rows="9" value={form.experience} onChange={e=>update('experience',e.target.value)}/><small>{form.experience.length}/5000 · minimum 120</small></label><label>What did the workplace do well?<textarea rows="4" maxLength="1500" value={form.positives} onChange={e=>update('positives',e.target.value)}/></label><label>What could improve?<textarea rows="4" maxLength="1500" value={form.improvements} onChange={e=>update('improvements',e.target.value)}/></label></Section>
      <Section n="5" title="Privacy and context"><div className="form-grid"><label>Public identity<select value={form.publicDisplay} onChange={e=>update('publicDisplay',e.target.value)}><option>Anonymous</option><option>First name only</option><option>Full name</option></select></label><label>May we contact you about moderation?<select value={form.contactPermission} onChange={e=>update('contactPermission',e.target.value)}><option>Yes</option><option>No</option></select></label><label>Could you provide proof if requested?<select value={form.proofAvailable} onChange={e=>update('proofAvailable',e.target.value)}><option>Yes</option><option>No</option><option>Prefer not to say</option></select></label><label>Would you work here again?<select value={form.wouldWorkAgain} onChange={e=>update('wouldWorkAgain',e.target.value)}><option>Yes</option><option>No</option><option>Prefer not to say</option></select></label></div></Section>
      <button disabled={busy} className="btn btn-dark full">{busy?'Saving changes…':'Save changes for moderation'}</button>
    </form>
  </section>
}
function Section({n,title,children}){return <section><div className="section-label"><span>{n}</span><h2>{title}</h2></div>{children}</section>}
