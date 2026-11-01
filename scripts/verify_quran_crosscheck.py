exec(open('cmp.py').read().split("for name,S in")[0])
B=T[(1,1)].strip()
def clean(k):
    t=T[k]
    if k[1]==1 and k[0] not in (1,9) and t.startswith(B): t=t[len(B):]
    return t.strip()
C={k:clean(k) for k in T}
def n(t): return unicodedata.normalize('NFC',t).strip()
ex=[k for k in C if n(C[k])==n(Q[k])]
bad=[k for k in C if n(C[k])!=n(Q[k])]
print('exact (NFC) match with quran.com after removing basmala prefix:',len(ex),'/6236; differing:',len(bad))
sk=[k for k in bad if skel(C[k])!=skel(Q[k])]
print('of which consonantal-skeleton differences:',len(sk),sk[:10])
for k in bad[:6]: print(k,[hex(ord(c)) for c in set(C[k])^set(Q[k])])
import collections
d=collections.Counter()
for k in bad:
    for c in set(C[k])^set(Q[k]): d[hex(ord(c))]+=1
print(d.most_common(8))
print('--- the two skeleton diffs')
for k in sk:
    print(k,'TANZIL',C[k]); print(k,'QCOM  ',Q[k])
    print([ (i,a,b) for i,(a,b) in enumerate(zip(C[k],Q[k])) if a!=b][:5])
other=[k for k in bad if k not in sk and set(C[k])^set(Q[k])-{'۞'}!=set()]
print('non-06DE, non-skeleton diffs:',len(other), other[:10])
# 06DE (rub el hizb sign) only: confirm all other diffs vanish when removed
r=lambda t:t.replace('۞','').replace('  ',' ').strip()
rest=[k for k in C if n(r(C[k]))!=n(r(Q[k]))]; print('after ignoring U+06DE:',len(rest),rest)
