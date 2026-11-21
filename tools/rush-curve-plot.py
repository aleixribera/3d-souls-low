"""Boss Rush's curve, before and after, as one picture (pass 168): the pace by fight, and the share of runs still going
at each fight for the three players of PLAN.md's targets (tools/rush-curve.cjs runs, DUMP files).
  python tools/rush-curve-plot.py <dir with before-*.json and after-*.json> <out.png>
Each JSON is a DUMP of `node tools/rush-curve.cjs runs`: new (no SKILLED), none (SKILLED), strong (SKILLED KIT=strong).
"""
import json, math, os, sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

src, out = sys.argv[1], sys.argv[2]
INK, MUTED, GRID = '#1f1f1e', '#6b6a63', '#e4e3de'
PLAYERS = [('new', 'New player', '#2a78d6', (4, 6)), ('none', 'Skilled, no good kit', '#eb6834', (12, 15)),
           ('strong', 'Skilled, two legendaries', '#1baf7a', (25, 30))]

def pace(won, rise, scale, steady, warm=4, warm_from=0.85):
    if won < warm: return warm_from + (1 - warm_from) * won / warm
    k = math.exp((min(won, steady) - warm) / scale)
    return 1 + rise * (k - 1) + rise / scale * k * max(0, won - steady)

def survival(path):
    runs = json.load(open(path))
    reached = sorted(r['reached'] for r in runs)
    xs = list(range(1, 42))
    return xs, [sum(1 for n in reached if n >= x) / len(reached) for x in xs], reached[len(reached) // 2]

plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 10, 'axes.edgecolor': GRID, 'axes.labelcolor': MUTED,
                     'xtick.color': MUTED, 'ytick.color': MUTED, 'text.color': INK})
fig, (a, b) = plt.subplots(1, 2, figsize=(13, 5.2), gridspec_kw={'width_ratios': [1, 1.5]})
for ax in (a, b):
    ax.grid(True, color=GRID, linewidth=0.8); ax.set_axisbelow(True)
    for s in ('top', 'right'): ax.spines[s].set_visible(False)

fights = list(range(1, 41))
a.plot(fights, [pace(f - 1, 0.55, 6.5, 11) for f in fights], color=MUTED, linewidth=2, linestyle='--', label='Before')
a.plot(fights, [pace(f - 1, 0.165, 6.5, 20) for f in fights], color=INK, linewidth=2, label='After')
a.set_title('Boss pace by fight', loc='left', fontsize=12, color=INK)
a.set_xlabel('Fight'); a.set_ylabel('Pace (x the boss as written)')
a.legend(frameon=False, loc='upper left')

for key, name, color, (lo, hi) in PLAYERS:
    medians = []
    for when, style in (('before', '--'), ('after', '-')):
        path = os.path.join(src, f'{when}-{key}.json')
        if not os.path.exists(path): continue
        xs, ys, med = survival(path)
        b.plot(xs, ys, color=color, linewidth=2, linestyle=style, label=f'{name}, {when} (median {med})')
        medians.append(med)
    b.axvspan(lo, hi, color=color, alpha=0.08, linewidth=0)
b.axhline(0.5, color=MUTED, linewidth=1)
b.text(41, 0.51, 'half the runs', color=MUTED, ha='right', va='bottom', fontsize=9)
b.set_title('Runs still going at each fight (shaded: target median)', loc='left', fontsize=12, color=INK)
b.set_xlabel('Fight'); b.set_ylabel('Share of runs'); b.set_xlim(1, 41); b.set_ylim(0, 1.02)
b.legend(frameon=False, fontsize=8.5, loc='upper right')
fig.tight_layout()
fig.savefig(out, dpi=110, facecolor='white')
print('wrote', out)
