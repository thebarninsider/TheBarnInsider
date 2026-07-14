# Final Supabase Checklist

## 1. Verify local environment

Create `.env.local`:

```env
VITE_SUPABASE_URL=https://pvdmhfztxbposraxhqnd.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Restart `npm run dev` after changing environment variables.

## 2. Create the admin

Sign up and confirm `thebarninsider@gmail.com`, then run:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where lower(email) = lower('thebarninsider@gmail.com')
);
```

Log out and back in.

## 3. Test the complete workflow

1. Create a second test employee account and confirm it.
2. Submit a review.
3. Confirm the review is visible in the employee dashboard as `pending`.
4. Log in as the admin.
5. Open `/admin` and publish the review.
6. Log out and confirm the review appears publicly.
7. Submit a report on the review.
8. Confirm it appears in the admin report queue.
9. Request proof from the admin dashboard.
10. Log in as the reviewer and upload a permitted file.
11. Confirm the file appears in Supabase Storage under `review-proof/<reviewer-id>/...`.
12. Submit and approve an employer profile claim.
13. Submit and approve an employer response.

## 4. Owner email notification

### Create a Resend account

Create an API key and, before public launch, verify your domain. During testing, Resend may permit its testing sender only to the account email.

### Install Supabase CLI

```bash
brew install supabase/tap/supabase
supabase login
cd /path/to/TheBarnInsider
supabase init
supabase link --project-ref pvdmhfztxbposraxhqnd
```

### Configure Edge Function secrets

```bash
supabase secrets set RESEND_API_KEY=YOUR_RESEND_KEY
supabase secrets set OWNER_EMAIL=thebarninsider@gmail.com
supabase secrets set NOTIFICATION_FROM_EMAIL='TheBarnInsider <notifications@YOURDOMAIN.com>'
```

Generate a secret:

```bash
openssl rand -hex 32
```

Save it:

```bash
supabase secrets set WEBHOOK_SECRET=PASTE_RANDOM_VALUE
```

Deploy:

```bash
supabase functions deploy notify-owner
```

### Create the database webhook

In Supabase open **Database → Webhooks → Create webhook**:

- Name: `notify-owner-new-review`
- Table: `public.reviews`
- Event: `INSERT`
- Destination: Edge Function `notify-owner`
- Header: `x-webhook-secret` with the same secret value

Submit a review and confirm the email reaches `thebarninsider@gmail.com`.

## 5. Production domain

After buying the domain:

1. Configure the custom domain in GitHub Pages.
2. Add the GitHub Pages DNS records at the registrar.
3. Enable HTTPS.
4. Set Supabase Authentication Site URL to the production URL.
5. Add these Redirect URLs:
   - `https://YOURDOMAIN.com/**`
   - `https://www.YOURDOMAIN.com/**`
   - `http://localhost:5173/**`
6. Update `NOTIFICATION_FROM_EMAIL` after verifying the sending domain.

## 6. Before accepting real reviews

- Test all RLS roles with separate accounts.
- Verify anonymous users cannot query pending reviews.
- Verify employees cannot publish their own reviews.
- Verify employers cannot read reviewer profiles or proof files.
- Verify only admins/moderators can access `/admin` data.
- Configure custom SMTP for Supabase Auth.
- Configure the owner email function.
- Add rate limiting/CAPTCHA to signup and report forms if abuse begins.
- Have a licensed attorney customize the legal documents to the final entity and jurisdiction.
