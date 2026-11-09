"""Check both names against two public resolvers before requesting TLS."""
import concurrent.futures
import datetime
import json
from pathlib import Path
import sys
import urllib.parse
import urllib.request

config = json.loads(Path(__file__).with_name('grib-aliases.json').read_text(encoding='utf-8'))
bases = [name.encode('idna').decode('ascii') for name in config['domains']]
resolvers = {'google': 'https://dns.google/resolve', 'cloudflare': 'https://cloudflare-dns.com/dns-query'}


def query(task):
    resolver, host, kind = task
    result = {'resolver': resolver, 'host': host, 'type': kind}
    url = resolvers[resolver] + '?' + urllib.parse.urlencode({'name': host, 'type': kind})
    try:
        request = urllib.request.Request(url, headers={'Accept': 'application/dns-json'})
        with urllib.request.urlopen(request, timeout=12) as response:
            data = json.load(response)
        number = 1 if kind == 'A' else 28
        result.update(status=data['Status'], addresses=[r['data'] for r in data.get('Answer', []) if r['type'] == number])
    except Exception as error:
        result['error'] = str(error)
    return result


tasks = [(resolver, host, kind) for base in bases for host in [base, 'www.' + base] for resolver in resolvers for kind in ['A', 'AAAA']]
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
    records = list(pool.map(query, tasks))
ready = []
for base in bases:
    checks = [r for r in records if r['host'] in [base, 'www.' + base]]
    if all(r.get('status') == 0 and (set(r['addresses']) == {config['ip']} if r['type'] == 'A' else not r['addresses']) for r in checks):
        ready.append(base)
report = {'checked_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'ready_bases': ready,
          'pending_bases': [base for base in bases if base not in ready], 'records': records}
destination = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('reference/alias-dns-current.json')
destination.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: report[key] for key in ['checked_at', 'ready_bases', 'pending_bases']}, ensure_ascii=False))
