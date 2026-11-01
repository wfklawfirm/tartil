"""Live end-to-end journey against a deployed Tartil API. Creates clearly-labelled TEST rows (run id in every email/slug).
Usage: python3 -I journey_live.py https://<ref>.supabase.co/functions/v1/api
Exits non-zero on the first failed expectation."""
import json, sys, time, urllib.request, urllib.error
BASE = sys.argv[1].rstrip('/'); RUN = str(int(time.time())); PW = 'correct-horse-battery-' + RUN
def call(method, path, token=None, body=None):
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'content-type': 'application/json', **({'authorization': 'Bearer ' + token} if token else {})})
    try:
        with urllib.request.urlopen(req, timeout=60) as r: return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b'{}')
fails = []
def expect(label, got, want):
    ok = got == want; print(('PASS ' if ok else 'FAIL ') + label + ('' if ok else f'  got={got!r} want={want!r}'))
    if not ok: fails.append(label)
def user(name):
    email = f'live-{RUN}-{name}@example.test'
    s, r = call('POST', '/auth/register', body={'displayName': name, 'email': email, 'password': PW}); assert s == 201, (s, r)
    s, t = call('POST', '/auth/login', body={'email': email, 'password': PW}); assert s == 200, (s, t)
    return {'id': r['id'], 'email': email, 'token': t['token']}
admin, qari, qari2, kid, parent, out = (user(n) for n in ['admin', 'qari', 'qari2', 'kid', 'parent', 'outsider'])
s, i = call('POST', '/institutions', admin['token'], {'name': 'TEST ' + RUN, 'slug': 'test-' + RUN}); expect('create institution', s, 201); inst = i['id']
s, o = call('POST', '/institutions', out['token'], {'name': 'TEST other ' + RUN, 'slug': 'test-o-' + RUN}); inst2 = o['id']
b = f'/i/{inst}'
for u, role in [(qari, 'qari'), (qari2, 'qari'), (kid, 'student'), (parent, 'guardian')]:
    expect(f'add {role}', call('POST', b + '/members', admin['token'], {'email': u['email'], 'role': role})[0], 201)
expect('student profile (minor)', call('POST', b + '/students', admin['token'], {'userId': kid['id'], 'isMinor': True})[0], 201)
s, l = call('POST', b + '/guardian-links', admin['token'], {'guardianUserId': parent['id'], 'studentUserId': kid['id'], 'relationship': 'parent'})
expect('qari assignment', call('POST', b + '/qari-assignments', admin['token'], {'qariUserId': qari['id'], 'studentUserId': kid['id']})[0], 201)
rec = {'editionCode': 'edition-x', 'riwayah': 'hafs', 'surah': 1, 'ayahStart': 1, 'ayahEnd': 7, 'audioObjectKey': 'private/live/1.webm'}
expect('unverified guardian cannot consent', call('POST', b + '/consents', parent['token'], {'studentUserId': kid['id'], 'purpose': 'audio_recording'})[0], 403)
s, e = call('POST', b + '/submissions', kid['token'], rec); expect('minor without consent blocked', (s, e.get('error')), (409, 'guardian_consent_required'))
expect('verify guardian', call('POST', b + f"/guardian-links/{l['id']}/verify", admin['token'])[0], 200)
s, c = call('POST', b + '/consents', parent['token'], {'studentUserId': kid['id'], 'purpose': 'audio_recording'}); expect('guardian consents', s, 201)
s, sub = call('POST', b + '/submissions', kid['token'], rec); expect('minor records with consent', s, 201)
expect('guardian revokes', call('POST', b + f"/consents/{c['id']}/revoke", parent['token'])[0], 200)
expect('recording blocked after revoke', call('POST', b + '/submissions', kid['token'], rec)[0], 409)
s, h = call('POST', b + '/halaqat', admin['token'], {'name': 'حلقة تجريبية', 'qariUserId': qari['id']}); expect('admin creates halaqah', s, 201)
expect('non-qari as halaqah qari rejected', call('POST', b + '/halaqat', admin['token'], {'name': 'bad', 'qariUserId': kid['id']})[0], 403)
expect('add member', call('POST', b + f"/halaqat/{h['id']}/members", admin['token'], {'studentUserId': kid['id']})[0], 201)
s, se = call('POST', b + f"/halaqat/{h['id']}/sessions", qari['token'], {'startsAt': '2026-11-02T05:00:00Z', 'endsAt': '2026-11-02T06:00:00Z'}); expect('qari creates session', s, 201)
expect('other qari cannot mark attendance', call('POST', b + f"/sessions/{se['id']}/attendance", qari2['token'], {'studentUserId': kid['id'], 'status': 'present'})[0], 404)
expect('qari marks attendance', call('POST', b + f"/sessions/{se['id']}/attendance", qari['token'], {'studentUserId': kid['id'], 'status': 'present'})[0], 201)
expect('guardian sees attendance', len(call('GET', b + f"/sessions/{se['id']}/attendance", parent['token'])[1].get('attendance', [])), 1)
a = {'studentUserId': kid['id'], 'surah': 1, 'ayahStart': 1, 'ayahEnd': 7, 'makharij': 3, 'fluency': 4}
expect('unassigned qari cannot assess', call('POST', b + '/assessments', qari2['token'], a)[0], 403)
expect('assigned qari assesses', call('POST', b + '/assessments', qari['token'], a)[0], 201)
expect('guardian sees assessment', len(call('GET', b + '/assessments', parent['token'])[1].get('assessments', [])), 1)
expect('other tenant admin sees no students', len(call('GET', b + '/students', out['token'])[1].get('students', [])), 0)
expect('other tenant cannot add member', call('POST', b + '/members', out['token'], {'email': kid['email'], 'role': 'student'})[0], 403)
expect('admin sees nothing in other tenant', len(call('GET', f'/i/{inst2}/students', admin['token'])[1].get('students', [])), 0)
expect('no token => 401', call('GET', b + '/students')[0], 401)
expect('forged token => 401', call('GET', b + '/students', admin['token'] + 'x')[0], 401)
s, ed = call('GET', '/quran/editions'); expect('Quran hidden until approved', ed.get('editions'), [])
expect('Quran surah 404 until approved', call('GET', '/quran/tanzil-uthmani-hafs-1.1/1')[0], 404)
print('RUN', RUN, 'FAILED' if fails else 'ALL PASSED'); sys.exit(1 if fails else 0)
