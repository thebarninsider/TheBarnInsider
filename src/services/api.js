import { supabase } from '../lib/supabase.js';

const one = async (query) => { const { data, error } = await query; if (error) throw error; return data; };
const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const authApi = {
  signUp: async ({ firstName, lastName, email, phone, password }) => one(supabase.auth.signUp({ email, password, options: { data: { first_name:firstName, last_name:lastName, phone } } })),
  signIn: async ({ email, password }) => one(supabase.auth.signInWithPassword({ email, password })),
  signOut: async () => one(supabase.auth.signOut()),
  resetPassword: async (email) => one(supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })),
  updatePassword: async (password) => one(supabase.auth.updateUser({ password })),
};

export async function getProfile(userId) {
  return one(supabase.from('profiles').select('*').eq('id', userId).single());
}

export async function updateProfile(userId, patch) {
  return one(supabase.from('profiles').update(patch).eq('id', userId).select().single());
}

export async function listPublishedReviews(
  search = "",
  { page = 0, pageSize = 12 } = {}
) {
  const cleanSearch = search
    .trim()
    .replace(/[,%()]/g, " ");

  const safePage = Math.max(0, Number(page) || 0);

  const safePageSize = Math.min(
    50,
    Math.max(1, Number(pageSize) || 12)
  );

  const from = safePage * safePageSize;
  const to = from + safePageSize;

  let matchingBarnIds = [];

  if (cleanSearch) {
    const { data: matchingBarns, error: barnError } =
      await supabase
        .from("barns")
        .select("id")
        .or(
          [
            `name.ilike.%${cleanSearch}%`,
            `location_city.ilike.%${cleanSearch}%`,
            `location_state.ilike.%${cleanSearch}%`,
            `discipline.ilike.%${cleanSearch}%`,
          ].join(",")
        );

    if (barnError) {
      throw barnError;
    }

    matchingBarnIds = (matchingBarns || []).map(
      (barn) => barn.id
    );
  }

  let query = supabase
    .from("reviews")
    .select("*, barns(*)")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .range(from, to);

  if (cleanSearch) {
    const filters = [
      `headline.ilike.%${cleanSearch}%`,
      `experience.ilike.%${cleanSearch}%`,
      `job_title.ilike.%${cleanSearch}%`,
    ];

    if (matchingBarnIds.length > 0) {
      filters.push(
        `barn_id.in.(${matchingBarnIds.join(",")})`
      );
    }

    query = query.or(filters.join(","));
  }

  const rows = await one(query);

  const hasMore = rows.length > safePageSize;

  return {
    rows: hasMore
      ? rows.slice(0, safePageSize)
      : rows,
    hasMore,
  };
}

export async function getBarn(id) {
  return one(supabase.from('barns').select('*').eq('id',id).single());
}

export async function getBarnReviews(barnId) {
  return one(supabase.from('reviews').select('*, employer_responses(*)').eq('barn_id',barnId).eq('status','published').is('deleted_at',null).order('published_at',{ascending:false}));
}

export async function getOrCreateBarn({ barnName, location, discipline, website }) {
  const cleanName = barnName?.trim();
  const cleanLocation = location?.trim();

  if (!cleanName) throw new Error('Barn name is required.');
  if (!cleanLocation) throw new Error('Barn location is required.');

  const [city = '', state = ''] = cleanLocation
    .split(',')
    .map((value) => value.trim());

  const existing = await supabase
    .from('barns')
    .select('*')
    .ilike('name', cleanName)
    .ilike('location_city', city)
    .ilike('location_state', state)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('You must be logged in to submit a review.');

  return one(
    supabase
      .from('barns')
      .insert({
        name: cleanName,
        slug: `${slugify(cleanName)}-${crypto.randomUUID().slice(0, 8)}`,
        location_city: city || null,
        location_state: state || null,
        discipline,
        website_url: website?.trim() || null,
        created_by: user.id,
      })
      .select()
      .single()
  );
}

export async function submitReview(form, ratings) {
  const barn = await getOrCreateBarn(form);
  const row = {
    barn_id:barn.id, reviewer_id:(await supabase.auth.getUser()).data.user.id,
    public_display: form.publicDisplay==='Full name'?'full_name':form.publicDisplay==='First name only'?'first_name':'anonymous',
    job_title:form.role, employment_status:{'Former employee':'former_employee','Current employee':'current_employee','Working student':'working_student','Intern / apprentice':'intern_apprentice'}[form.employmentStatus],
    tenure:{'Under 3 months':'under_3_months','3–6 months':'3_6_months','6–12 months':'6_12_months','1–2 years':'1_2_years','2–5 years':'2_5_years','5+ years':'5_plus_years'}[form.tenure],
    average_weekly_hours:Number(form.weeklyHours), pay_basis:form.payType.toLowerCase(), pay_amount:Number(form.payAmount), currency:form.currency,
    housing_arrangement:{'Not provided':'not_provided','Provided at no charge':'provided_free','Provided and deducted from pay':'deducted_from_pay','Provided for a separate fee':'separate_fee','Promised but not provided':'promised_not_provided'}[form.housing],
    rating_overall:ratings.overall, rating_pay:ratings.pay, rating_management:ratings.management, rating_housing:
  form.housing === "Not provided"
    ? null
    : ratings.housing,
    rating_work_life:ratings.workLife, rating_horse_care:ratings.horseCare, rating_safety:ratings.safety, rating_growth:ratings.growth,
    headline:form.headline, experience:form.experience, positives:form.positives||null, improvements:form.improvements||null,
    contact_permission:form.contactPermission==='Yes', proof_available:form.proofAvailable==='Yes'?'yes':form.proofAvailable==='No'?'no':'prefer_not_to_say',
    would_work_again:form.wouldWorkAgain==='Yes'?true:form.wouldWorkAgain==='No'?false:null,
    certified_firsthand:form.certifyFirsthand, certified_truthful:form.certifyTruth, accepted_policies:form.acceptPolicy,
  };
  return one(supabase.from('reviews').insert(row).select().single());
}

export async function getMyReviews(userId) { return one(supabase.from('reviews').select('*, barns(*)').eq('reviewer_id',userId).order('submitted_at',{ascending:false})); }

export async function getOwnReview(reviewId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in.');
  return one(supabase.from('reviews').select('*, barns(*)').eq('id', reviewId).eq('reviewer_id', user.id).single());
}

function reviewPayload(form, ratings, barnId) {
  return {
    barn_id: barnId,
    public_display: form.publicDisplay === 'Full name' ? 'full_name' : form.publicDisplay === 'First name only' ? 'first_name' : 'anonymous',
    job_title: form.role,
    employment_status: {'Former employee':'former_employee','Current employee':'current_employee','Working student':'working_student','Intern / apprentice':'intern_apprentice'}[form.employmentStatus],
    tenure: {'Under 3 months':'under_3_months','3–6 months':'3_6_months','6–12 months':'6_12_months','1–2 years':'1_2_years','2–5 years':'2_5_years','5+ years':'5_plus_years'}[form.tenure],
    average_weekly_hours: Number(form.weeklyHours),
    pay_basis: form.payType.toLowerCase(),
    pay_amount: Number(form.payAmount),
    currency: form.currency,
    housing_arrangement: {'Not provided':'not_provided','Provided at no charge':'provided_free','Provided and deducted from pay':'deducted_from_pay','Provided for a separate fee':'separate_fee','Promised but not provided':'promised_not_provided'}[form.housing],
    rating_overall: ratings.overall,
    rating_pay: ratings.pay,
    rating_management: ratings.management,
    rating_housing:
  form.housing === "Not provided"
    ? null
    : ratings.housing,
    rating_work_life: ratings.workLife,
    rating_horse_care: ratings.horseCare,
    rating_safety: ratings.safety,
    rating_growth: ratings.growth,
    headline: form.headline,
    experience: form.experience,
    positives: form.positives || null,
    improvements: form.improvements || null,
    contact_permission: form.contactPermission === 'Yes',
    proof_available: form.proofAvailable === 'Yes' ? 'yes' : form.proofAvailable === 'No' ? 'no' : 'prefer_not_to_say',
    would_work_again: form.wouldWorkAgain === 'Yes' ? true : form.wouldWorkAgain === 'No' ? false : null,
    certified_firsthand: true,
    certified_truthful: true,
    accepted_policies: true,
  };
}

export async function updateOwnReview(reviewId, form, ratings) {
  const currentReview = await getOwnReview(reviewId);

  if (!currentReview) {
    throw new Error("Review not found.");
  }

  let barnId = currentReview.barn_id;

  const currentBarn = currentReview.barns;

  const cleanBarnName = form.barnName?.trim() || "";
  const cleanLocation = form.location?.trim() || "";

  const [newCity = "", newState = ""] = cleanLocation
    .split(",")
    .map((value) => value.trim());

  const barnDetailsChanged =
    cleanBarnName.toLowerCase() !==
      (currentBarn?.name || "").trim().toLowerCase() ||
    newCity.toLowerCase() !==
      (currentBarn?.location_city || "").trim().toLowerCase() ||
    newState.toLowerCase() !==
      (currentBarn?.location_state || "").trim().toLowerCase();

  if (barnDetailsChanged) {
    const barn = await getOrCreateBarn(form);
    barnId = barn.id;
  }

  const payload = {
    ...reviewPayload(form, ratings, barnId),
    status: "pending",
    published_at: null,
    removed_at: null,
    deleted_at: null,
    moderator_note: null,
    rejection_reason: null,
    submitted_at: new Date().toISOString(),
  };

  return one(
    supabase
      .from("reviews")
      .update(payload)
      .eq("id", reviewId)
      .eq("reviewer_id", currentReview.reviewer_id)
      .select()
      .single()
  );
}

export async function withdrawOwnReview(reviewId) {
  return one(supabase.from('reviews').update({ status: 'withdrawn', deleted_at: new Date().toISOString(), published_at: null }).eq('id', reviewId).select().single());
}
export async function getMyClaims(userId) { return one(supabase.from('barn_claims').select('*').eq('claimant_id',userId).order('submitted_at',{ascending:false})); }
export async function submitClaim(f) { return one(supabase.from('barn_claims').insert({ claimant_id:(await supabase.auth.getUser()).data.user.id, barn_id:f.barnId||null, barn_name:f.barnName, claimant_legal_name:f.legalName, role_title:f.roleTitle, business_email:f.businessEmail, business_phone:f.phone||null, website_url:f.website||null, explanation:f.explanation, authority_certified:f.authority, response_rules_accepted:f.responseRules }).select().single()); }
export async function flagReview(reviewId,f) { return one(supabase.from('review_flags').insert({ review_id:reviewId, reporter_id:(await supabase.auth.getUser()).data.user.id, reason:f.reason, challenged_text:f.challengedText||null, details:f.details }).select().single()); }
export async function submitEmployerResponse(review,barnId,body) { return one(supabase.from('employer_responses').insert({ review_id:review, barn_id:barnId, author_id:(await supabase.auth.getUser()).data.user.id, response_body:body }).select().single()); }
export async function getNotifications(userId) { return one(supabase.from('notifications').select('*').eq('user_id',userId).order('created_at',{ascending:false})); }
export async function markNotificationRead(id) { return one(supabase.from('notifications').update({is_read:true,read_at:new Date().toISOString()}).eq('id',id)); }
export async function getOpenProofRequests(userId) { return one(supabase.from('proof_requests').select('*, reviews(headline, barn_id, barns(name))').eq('requested_from',userId).in('status',['open','submitted']).order('created_at',{ascending:false})); }
export async function uploadProof(request,file,description='') {
  const { data:{user} }=await supabase.auth.getUser(); const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'); const path=`${user.id}/${request.review_id}/${crypto.randomUUID()}-${safe}`;
  const up=await supabase.storage.from('review-proof').upload(path,file,{upsert:false}); if(up.error) throw up.error;
  await one(supabase.from('proof_files').insert({ proof_request_id:request.id, uploader_id:user.id, storage_path:path, original_filename:file.name, mime_type:file.type, file_size_bytes:file.size, description }).select().single());
  await one(supabase.from('proof_requests').update({status:'submitted',responded_at:new Date().toISOString()}).eq('id',request.id)); return path;
}

export async function adminQueue() {
  const [reviews,published,removed,claims,responses,flags] = await Promise.all([
    one(supabase.from('reviews').select('*, barns(name,location_city,location_state,discipline), profiles(first_name,last_name)').in('status',['pending','changes_requested','proof_requested','under_review','flagged']).order('submitted_at')),
    one(supabase.from('reviews').select('*, barns(name,location_city,location_state,discipline), profiles(first_name,last_name)').eq('status','published').is('deleted_at',null).order('published_at',{ascending:false})),
    one(supabase.from('reviews').select('*, barns(name,location_city,location_state,discipline), profiles(first_name,last_name)').in('status',['removed','withdrawn']).order('updated_at',{ascending:false})),
    one(
  supabase
    .from("barn_claims")
    .select("*")
    .in("status", ["pending", "approved"])
    .order("submitted_at", { ascending: false })
),
    one(supabase.from('employer_responses').select('*, reviews(headline), barns(name)').eq('status','pending').order('submitted_at')),
    one(supabase.from('review_flags').select('*, reviews(headline,barn_id,barns(name))').in('status',['open','under_review']).order('created_at')),
  ]); return {reviews,published,removed,claims,responses,flags};
}

async function logAction(entity, id, action, oldStatus, newStatus, note='') {
  const { data:{user} }=await supabase.auth.getUser();
  const row={moderator_id:user.id,action_type:action,previous_status:oldStatus,new_status:newStatus,internal_note:note}; row[`${entity}_id`]=id;
  await one(supabase.from('moderation_actions').insert(row));
}
export async function moderateReview(review,status,note='') { const patch={status,moderator_note:note}; if(status==='published')patch.published_at=new Date().toISOString(); if(status==='removed')patch.removed_at=new Date().toISOString(); await one(supabase.from('reviews').update(patch).eq('id',review.id)); await logAction('review',review.id,'status_change',review.status,status,note); }
export async function createProofRequest(review,note) { const {data:{user}}=await supabase.auth.getUser(); const pr=await one(supabase.from('proof_requests').insert({review_id:review.id,requested_from:review.reviewer_id,requested_by:user.id,request_message:note,due_at:new Date(Date.now()+7*86400000).toISOString()}).select().single()); await moderateReview(review,'proof_requested',note); return pr; }
export async function moderateClaim(claim,status,note='') { await one(supabase.from('barn_claims').update({status,admin_note:note,reviewed_at:new Date().toISOString(),reviewed_by:(await supabase.auth.getUser()).data.user.id}).eq('id',claim.id)); await logAction('claim',claim.id,'claim_decision',claim.status,status,note); }
export async function moderateResponse(response,status,note='') { const patch={status,moderator_note:note}; if(status==='published')patch.published_at=new Date().toISOString(); await one(supabase.from('employer_responses').update(patch).eq('id',response.id)); await logAction('response',response.id,'response_decision',response.status,status,note); }


export async function getModerationActions(reviewId) {
  return one(
    supabase
      .from('moderation_actions')
      .select('*')
      .eq('review_id', reviewId)
      .order('created_at', { ascending: false })
  );
}

export async function resolveFlag(flag, status, note='') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Administrator session required.');
  await one(
    supabase
      .from('review_flags')
      .update({
        status,
        resolution_note: note || null,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq('id', flag.id)
  );
  await logAction('flag', flag.id, 'flag_resolution', flag.status, status, note);
}

export async function markAllNotificationsRead(userId) {
  return one(
    supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false)
  );
}

export async function getProofFilesForReview(reviewId) {
  const { data: proofRequests, error: requestError } = await supabase
    .from("proof_requests")
    .select("id, review_id, status, created_at, responded_at")
    .eq("review_id", reviewId)
    .order("created_at", { ascending: false });

  if (requestError) {
    throw requestError;
  }

  if (!proofRequests?.length) {
    return [];
  }

  const requestIds = proofRequests.map((request) => request.id);

  const { data: proofFiles, error: fileError } = await supabase
    .from("proof_files")
    .select(`
      id,
      proof_request_id,
      storage_path,
      original_filename,
      mime_type,
      file_size_bytes,
      description,
      created_at
    `)
    .in("proof_request_id", requestIds)
    .order("created_at", { ascending: false });

  if (fileError) {
    throw fileError;
  }

  return proofFiles || [];
}

export async function openProofFile(storagePath) {
  if (!storagePath) {
    throw new Error("The proof file path is missing.");
  }

  const { data, error } = await supabase.storage
    .from("review-proof")
    .createSignedUrl(storagePath, 300);

  if (error) {
    throw error;
  }

  if (!data?.signedUrl) {
    throw new Error("Unable to create a secure proof link.");
  }

  window.open(data.signedUrl, "_blank", "noopener,noreferrer");

  return data.signedUrl;
}
export async function revokeOwnBarnClaim(claimId) {
  const { error } = await supabase.rpc("revoke_own_barn_claim", {
    target_claim_id: claimId,
  });

  if (error) {
    throw error;
  }

  return true;
}

export async function revokeBarnClaimAsAdmin(claim, note = "") {
  const { data: { user }, error: userError } =
    await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Administrator session required.");
  }

  const { error } = await supabase
    .from("barn_claims")
    .update({
      status: "revoked",
      admin_note:
        note.trim() ||
        "Claim revoked by administrator.",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", claim.id);

  if (error) {
    throw error;
  }

  await logAction(
    "claim",
    claim.id,
    "claim_revoked",
    claim.status,
    "revoked",
    note.trim() || "Claim revoked by administrator."
  );

  return true;
}
