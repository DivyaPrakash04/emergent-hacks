const {test} = require('node:test');
const assert = require('node:assert/strict');
const {trust, transition} = require('./demo-account.js');
const account = role => ({role, consent:false, verification:{email:'pending',idSelfie:'pending',card:'pending'}});
test('checks require email first', () => {assert.throws(() => transition(account('seeker'),'card','passed'));});
test('all three checks are required, failures remain caution and can be retried', () => {
 let u = account('seeker');
 for (const check of ['email','idSelfie','card']) { assert.equal(trust(u).status,'caution'); u=transition(u,check,'passed'); }
 assert.equal(trust(u).status,'verified');
 u=transition(u,'card','failed'); assert.equal(trust(u).status,'caution');
 u=transition(u,'card','passed'); assert.equal(trust(u).status,'verified');
});
test('host consent and suspension take precedence', () => {
 let u=account('host'); for(const check of ['email','idSelfie','card']) u=transition(u,check,'passed');
 assert.equal(trust(u).status,'caution'); u.consent=true; assert.equal(trust(u).status,'verified');
 u.suspended=true; assert.equal(trust(u).status,'suspended');
});
test('invalid transitions rejected without mutating state', () => {
 const u=account('seeker'); assert.throws(()=>transition(u,'unknown','passed'));
 const next=transition(u,'email','passed'); assert.equal(u.verification.email,'pending'); assert.equal(next.verification.email,'passed');
});
