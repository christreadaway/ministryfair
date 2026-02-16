# Ministry Fair - Business & Product Management Specification

**Repository:** `ministryfair`  
**Filename:** `ministryfair-BUSINESS_SPEC.md`  
**Last Updated:** 2026-02-16

---

## 1. Product/Feature Name and Problem It Solves

**What's the product/feature called?**
Ministry Fair - Catholic Parish Ministry Signup System

**What specific problem does it solve?**
Parish ministry recruitment is manual, paper-based, and results in lost volunteer opportunities. Paper sign-up sheets get misplaced, data entry is time-consuming, follow-up is inconsistent, and ministry leaders don't get timely notifications about new volunteers.

**Who experiences this problem and why does it matter to them?**
- **Parish Staff:** Spend hours manually entering paper sign-ups into spreadsheets, dealing with illegible handwriting
- **Ministry Leaders:** Miss out on volunteers because sign-up sheets don't reach them for days/weeks
- **Parishioners:** Don't know what ministries exist, intimidated by paper forms at ministry fair tables, want instant confirmation they're signed up

**What's the current state?**
Annual ministry fair with 30-40 ministry tables, each with paper sign-up sheets. Parishioners walk the room, collect flyers, fill out forms. Parish staff collects hundreds of sheets after the event, manually types data into spreadsheets, emails ministry leaders. Process takes 1-2 weeks. Estimated 20-30% of sign-ups lost or delayed.

**What's broken or inefficient?**
- Paper sheets get lost or damaged
- Handwriting illegible
- No instant confirmation for parishioners
- Ministry leaders can't follow up immediately while interest is high
- Parish staff bottleneck - all data entry falls on 1-2 people
- No way to track which ministries are popular
- Can't do QR codes or digital promotion effectively

---

## 2. Target Customer and Market Context

**Who is the primary customer?**
Catholic parishes (50-5,000 members) in the US running annual ministry fairs, specifically:
- **Parish Administrators/Pastors** (decision makers, budget holders)
- **Parish Staff** (event coordinators, volunteer coordinators) - primary users
- **Ministry Leaders** (volunteers running specific ministries) - secondary users

**What's their world like?**
- Limited budget - most parishes under 1,000 members have <$5K/year for software
- Low technical literacy - staff often 50+ years old, comfortable with Google but not complex tools
- Volunteer-driven - most ministries led by volunteers with full-time jobs
- Annual event cycle - ministry fair happens once/year, high-stakes 2-hour window
- Google Workspace already in use - most Catholic parishes use Google for email
- Mobile-first parishioners - 80%+ of congregation has smartphones

**How big is this problem for them?**
Daily pain for staff during 2-week post-event period. Occasional but acute pain for ministry leaders who lose volunteer momentum. Existential issue for parish life - volunteer engagement is core to Catholic parish health.

**Secondary users or stakeholders?**
- Diocese (may want to see parish engagement metrics)
- Parishioners (end users of the system)
- IT volunteers (may help with setup/troubleshooting)

---

## 3. User Story

**As a Parish Volunteer Coordinator**, I want to digitize our annual ministry fair sign-ups so that ministry leaders get instant notifications and we don't lose volunteers due to manual data entry delays.

**What job is this hiring the product to do?**
Replace the paper sign-up workflow with digital system that captures volunteer interest at peak moment (during fair), delivers that interest immediately to ministry leaders, and eliminates manual data entry burden.

---

## 4. Value Proposition

**Why this solution vs. what exists today?**
- **vs. Paper forms:** Instant vs 1-2 week delay, zero data entry vs hours of work, no lost sheets
- **vs. Generic form builders (TypeForm, Google Forms):** Purpose-built for ministry fair context, QR codes per ministry, Google Sheets integration parishes already use
- **vs. Church management systems:** Fraction of the cost ($0 vs $2K+/year), works with existing tools, no training required

**Key insight or unlock:**
Catholic parishes already use Google Workspace. By integrating with Google Sheets + Google Sign-In, we eliminate separate login/database costs and leverage existing infrastructure parishes already pay for.

**Alternatives considered/rejected:**
- Custom database → Too expensive to maintain, parishes don't want another login
- Native mobile app → Too much friction at event (app download), web works better
- SMS-based system → Older parishioners may not text, QR codes to web more universal

---

## 5. Core Functionality

**Happy path workflow:**

1. **Setup (Parish Staff - 30 minutes before fair):**
   - Admin connects Google Sheet (one-time)
   - Adds 20-30 ministries with descriptions
   - Generates QR codes, prints table tents
   - Tests one sign-up to verify notifications work

2. **Sign-Up (Parishioner - 30 seconds at ministry fair):**
   - Walks to ministry table
   - Scans QR code on table tent with phone camera
   - Sees ministry description page
   - Clicks "Sign Up"
   - Authenticates with Google (or already logged in)
   - Sees confirmation screen
   - Receives confirmation email

3. **Notification (Ministry Leader - Immediate):**
   - Gets email: "Jane Smith just signed up for Youth Ministry!"
   - Includes contact info (name, email, phone if provided)
   - Can reply directly to welcome new volunteer

4. **Admin View (Parish Staff - Real-time):**
   - Opens Google Sheet
   - Sees live sign-ups populating
   - Can export, sort, filter
   - Views dashboard: "42 sign-ups today, Youth Ministry most popular"

**What the user sees/clicks/inputs/receives:**
- Parishioner: QR code → website → sign-up button → Google login → confirmation
- Ministry Leader: Email in inbox with volunteer contact info
- Parish Staff: Google Sheet with live data + analytics dashboard

---

## 6. Inputs and Outputs

**Inputs:**
- Ministry information (name, description, leader email, category, time commitment)
- Parishioner authentication (Google Sign-In)
- Parishioner contact preferences
- QR code scans (tracking which ministry table they came from)

**Outputs:**
- Real-time Google Sheet updates (new row per sign-up)
- Email to ministry leader (instant notification)
- Email to parishioner (confirmation)
- QR code images (printable PDFs)
- Analytics dashboard (sign-up counts, timestamps, popular ministries)

**What user gets at the end:**
- Parishioner: Instant confirmation they're signed up + welcome email from leader
- Ministry Leader: Contact info for enthusiastic volunteer while momentum is high
- Parish Staff: Clean spreadsheet with zero manual entry

---

## 7. Business Rules and Logic

**Core rules:**
- Must authenticate with Google before sign-up (prevents spam)
- One sign-up per person per ministry (can sign up for multiple ministries)
- Duplicate sign-up shows friendly message: "You're already signed up for this!"
- Ministry leader email must be valid (validated on save)

**Edge cases:**
- **If Google Sheets unavailable:** Queue sign-ups locally, retry every 30 seconds, display "Processing..." to user
- **If notification email fails:** Log error, show in admin dashboard, don't block sign-up
- **If user not logged into Google:** Redirect to Google Sign-In, return to ministry page after authentication
- **If QR code damaged/incorrect:** Deep link fails, redirect to ministry list page with search

**What happens when things go wrong:**
- Internet down at event → Display "Please try again" message, log attempt for manual follow-up
- User closes browser mid-sign-up → Data not saved, no harm
- Ministry leader email bounces → Admin gets weekly report of bounced emails

---

## 8. Data Requirements

**Information stored:**
- **Ministries:** ID, name, description, category, leader name/email, time commitment, active status, created/modified dates
- **Sign-Ups:** ID, ministry ID, parishioner name/email/phone, timestamp, source (QR/web), IP address (for fraud detection)
- **Parish Config:** Domain, Google Sheet ID, webhook URL, branding settings
- **Analytics:** Daily sign-up counts, ministry popularity, peak times

**Where it comes from:**
- Ministry info → Manually entered by parish staff
- Parishioner data → Google Sign-In OAuth2 response
- Timestamps → Server-generated
- Analytics → Aggregated from sign-up records

**How long we keep it:**
- Sign-up records → Permanent (parish historical records)
- Session data → 24 hours
- Error logs → 90 days
- Analytics aggregates → Permanent

---

## 9. Integrations and Dependencies

**Required integrations:**
- Google Sign-In (OAuth2) - For authentication
- Google Sheets API - For data storage
- Google Apps Script - Backend webhook for form submissions
- Netlify - Hosting and deployment

**Dependencies (what needs to be in place):**
- Parish must have Google Workspace account
- Parish must allow public Google Sheet sharing (with script access)
- Ministry leaders must have valid email addresses
- Parishioners must have Google accounts (95%+ do via Gmail)

**Network dependencies:**
- Internet connection at ministry fair (parish WiFi or cellular)
- Google APIs must be operational (99.9% uptime SLA)

---

## 10. Business Metrics and Success Criteria

**Technical success (how we know it works):**
- Zero lost sign-ups (100% data integrity)
- <2 second page load time on 4G mobile
- <1 minute notification delivery time
- System handles 100+ concurrent sign-ups without errors

**Business success (how we know it's valuable):**
- **Primary metric:** % of ministry fair sign-ups that happen digitally (goal: 80%+)
- Ministry leader engagement: % of leaders who reply to new volunteer within 24 hours (goal: 60%+)
- Volunteer retention: % of fair sign-ups who attend first ministry meeting (goal: 40%+ vs. <20% with paper)

**Key metric that tells us people want this:**
Repeat usage - parish runs fair again next year using the system instead of reverting to paper

**30/60/90 day goals:**
- **30 days:** 3 pilot parishes successfully run ministry fair
- **60 days:** 10 parishes using system, 80%+ sign-ups digital
- **90 days:** 25 parishes, testimonials from ministry leaders about faster follow-up

---

## 11. Assumptions and Risks

**Assumptions:**
- Parishioners have smartphones (what if 20% don't?)
- Parish has reliable WiFi at event venue (what if cellular only?)
- Ministry leaders check email regularly (what if they don't?)
- Google accounts are universal (what if some parishioners refuse Gmail?)
- Parish staff can handle initial setup (what if they need hand-holding?)

**Risks:**
- **Technology failure at event:** Internet goes down during 2-hour window = lost opportunity (Mitigation: Offline mode with sync)
- **Adoption resistance:** "We've always done it this way" mindset (Mitigation: Pilot with tech-friendly parishes first)
- **Data privacy concerns:** Parishioners worry about data sharing (Mitigation: Clear privacy policy, parish controls data)
- **Cost sensitivity:** Free today, but can't stay free forever (Mitigation: Freemium model, premium features for larger parishes)

**What would kill this:**
- Google deprecates Sheets API or changes OAuth policies
- Parishes consolidate to enterprise church management systems
- Gen Z parishioners demand native app experience (web not enough)
- Data breach or privacy scandal

---

## 12. Out of Scope

**Not building in v1:**
- Payment/donation processing
- Background checks or volunteer screening
- Calendar integration for ministry events
- Volunteer hour tracking
- Multi-parish networks or diocese-level aggregation
- Ministry leader dashboard (they use Google Sheets directly)
- Native mobile app (web-responsive only)
- Attendance tracking for ministry meetings
- Automated follow-up/reminder emails
- Social features (comments, reviews of ministries)

**Features deferred:**
- SMS notifications (email only for now)
- Multi-language support (English only v1)
- Advanced analytics (just basic dashboards)
- A/B testing of sign-up flows
- Integration with existing church management systems

---

## 13. Open Design Questions

**Need to test/validate:**
- Do older parishioners (65+) successfully scan QR codes without help?
- What % of parishioners willing to create Google account if they don't have one?
- Is email notification sufficient or do ministry leaders need SMS too?
- How many ministries is too many for one fair (UX breaks down at 50+?)

**Decisions we need more information to make:**
- Should we allow anonymous browsing before requiring sign-in?
- How do we handle ministry capacity limits (e.g., "Only 10 volunteers needed")?
- What's the right data retention policy for inactive parishes?
- Do we need approval workflow for sign-ups or is instant okay?
- How do we handle unsign-up requests (someone changes their mind)?

**Risks we're accepting:**
- Building on Google's platform (could change terms/pricing)
- Relying on parish staff to keep ministry leader emails updated
- No offline mode in v1 (accepting risk of internet failure at event)

---

## Notes

This business specification is maintained by **Claude.AI Chat** which has access to full conversation history, market context, and strategic product decisions.

**To update this spec:** Upload recent Claude Code transcripts or provide business context to Claude.AI Chat and say "Update the ministryfair business spec using my 13-point PM template."
