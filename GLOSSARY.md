# Job Search Tracker

A personal tracker for job hunting: the roles you're pursuing, the companies and people around them, and how each one is going.

## Language

### Pursuit

**Role**:
A single job posting together with your pursuit of it, optionally at a known Company. Reposted jobs are new Roles.
_Avoid_: Job, posting, application, opportunity

**Company**:
An organization that has posted Roles you're tracking.
_Avoid_: Employer, org

**Application**:
The act of moving a Role into the applied Status for the first time; not a separate record.
_Avoid_: Submission

**Fit rating**:
Your optional 1–5 judgement of how well a Role suits you, alongside free-text fit notes.
_Avoid_: Score, match

**Flag**:
A short user-defined warning on a Company (dealbreaker) or Role (process concern), such as "data monetization" or "Workday portal".
_Avoid_: Tag, label, red flag

**Posting link**:
The link to the job posting itself (usually LinkedIn).

**Hiring site link**:
The link to the Company's own careers page or application form for a Role.
_Avoid_: Apply link, careers link

**Posting copy**:
The posting's text as you pasted it into a Role, with the date saved, kept in case the posting is taken down.
_Avoid_: Snapshot, scrape, archive

**Expected salary**:
The salary figure you share with a Company for a Role.
_Avoid_: Ask, target

**Minimum salary**:
Your private walk-away figure for a Role; never shared or exported to CSV.
_Avoid_: Floor, reservation

**Salary note**:
The qualifiers on a posted salary range that numbers can't hold, such as "OTE" or "+ equity".

**Company size**:
A Company's headcount band as you recorded it, e.g. "51–200 (143 on LinkedIn)".

**Referral submitted**:
Whether a referrer has actually put your name forward for a Role.

### Progress

**Status**:
Where a Role currently stands in your pipeline, drawn from a configurable ordered list.
_Avoid_: Stage, state, phase

**Applied status**:
The one Status flagged as meaning "you've applied"; defaults to Applied.

**Parked**:
The Status for a Role that fits except for one thing you might later relax; not closed, since you may return to it.
_Avoid_: On hold, shelved, backlog

**Parked reason**:
Why a Role was Parked, kept after it moves on.

**Passed**:
The Status for a Role you decided not to apply to.
_Avoid_: Skip, skipped, declined

**Closed status**:
A Status that ends a pursuit (by default Accepted, Rejected, No Response, Withdrawn, Passed); hidden from the pipeline board unless asked for.
_Avoid_: Final, terminal, archived

**Status history**:
The automatic record of every Status change on a Role: from, to and when, starting with the Status it was created in. Never entered or edited by hand.
_Avoid_: Audit log, activity

**Imported entry**:
A Status history entry created by an import rather than by you; it never counts toward the Daily target.

**Daily target**:
How many Applications you aim to make per day; counted by the day each Role first entered the applied Status.
_Avoid_: Quota, goal

### People

**Contact**:
A person connected to your search, optionally at a Company.
_Avoid_: Person, connection

**Title**:
A Contact's job title.
_Avoid_: Role (that word means a posting here), position

**Role contact**:
A link between a Contact and a Role, typed as referrer, recruiter, hiring manager or other.
_Avoid_: Relationship, association

**Interview**:
A scheduled or completed conversation for a Role, with Contacts as its interviewers.
_Avoid_: Meeting, call

**Interviewer**:
A Contact on an Interview. Known only through Interviews, never linked to a Role directly.
