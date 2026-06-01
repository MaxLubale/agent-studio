// tools/gmail.js
const fakeInbox = [
  { id: 1, from: "boss@company.com", subject: "Meeting", body: "Join at 3PM" },
  { id: 2, from: "hr@company.com", subject: "Policy", body: "Updated handbook" }
];

async function listEmails() {
  return fakeInbox;
}

async function searchEmails(query) {
  return fakeInbox.filter(e =>
    e.from.includes(query) || e.subject.includes(query)
  );
}

async function sendEmail({ to, subject, body }) {
  return { status: "sent", to, subject };
}

module.exports = { listEmails, searchEmails, sendEmail };