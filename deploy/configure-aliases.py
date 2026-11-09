"""Install temporary redirects; optionally issue TLS for independently checked DNS."""
import argparse
import datetime
import json
import os
from pathlib import Path
import re
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--install', action='store_true')
parser.add_argument('--dns-report', type=Path)
args = parser.parse_args()
config = json.loads(Path(__file__).with_name('grib-aliases.json').read_text(encoding='utf-8'))
bases = [name.encode('idna').decode('ascii') for name in config['domains']]
assert config['target'] == 'https://grib.info' and config['ip'] == '82.146.42.213'
assert all(re.fullmatch(r'[a-z0-9-]+(?:\.[a-z0-9-]+)+', base) for base in bases)
names = [host for base in bases for host in [base, 'www.' + base]]
certificate = Path('/etc/letsencrypt/live/grib-info-aliases')
conf = Path('/etc/nginx/sites-available/grib-info-aliases.conf')
enabled = Path('/etc/nginx/sites-enabled/grib-info-aliases.conf')


def certificate_names():
    if not (certificate / 'fullchain.pem').exists():
        return []
    output = subprocess.check_output(['openssl', 'x509', '-in', str(certificate / 'fullchain.pem'), '-noout', '-ext', 'subjectAltName'], text=True)
    return re.findall(r'DNS:([a-zA-Z0-9.-]+)', output)


def render(tls_names):
    result = '# Temporary aliases for grib.info; managed by configure-aliases.py\n'
    result += 'server {\n    listen 80;\n    listen [::]:80;\n    server_name ' + ' '.join(names) + ';\n'
    result += '    location ^~ /.well-known/acme-challenge/ { root /var/www/letsencrypt; try_files $uri =404; }\n'
    result += '    location / { return 302 https://grib.info$request_uri; }\n}\n'
    if tls_names:
        result += 'server {\n    listen 443 ssl;\n    listen [::]:443 ssl;\n    server_name ' + ' '.join(tls_names) + ';\n'
        result += f'    ssl_certificate {certificate}/fullchain.pem;\n    ssl_certificate_key {certificate}/privkey.pem;\n'
        result += '    include /etc/letsencrypt/options-ssl-nginx.conf;\n    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;\n'
        result += '    return 302 https://grib.info$request_uri;\n}\n'
    return result


def install(tls_names):
    existing = subprocess.run(['nginx', '-T'], capture_output=True, text=True, check=True).stdout
    for block in existing.split('# configuration file ')[1:]:
        source = block.split(':', 1)[0]
        if Path(source).resolve() == conf:
            continue
        for match in re.finditer(r'\bserver_name\s+([^;]+);', block):
            overlap = set(match.group(1).split()) & set(names)
            if overlap:
                raise RuntimeError(f'Existing vhost conflict in {source}: {sorted(overlap)}')
    old = conf.read_bytes() if conf.exists() else None
    if old:
        backup = Path('/var/backups/grib-info-aliases')
        backup.mkdir(parents=True, exist_ok=True)
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        (backup / (stamp + '.conf')).write_bytes(old)
    temp = conf.with_suffix('.conf.next')
    temp.write_text(render(tls_names), encoding='utf-8')
    temp.chmod(0o644)
    os.replace(temp, conf)
    new_link = not enabled.is_symlink() and not enabled.exists()
    if new_link:
        enabled.symlink_to(conf)
    elif enabled.resolve() != conf:
        raise RuntimeError('Unexpected sites-enabled target')
    try:
        subprocess.run(['nginx', '-t'], check=True)
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
    except BaseException:
        if old is None:
            conf.unlink(missing_ok=True)
        else:
            conf.write_bytes(old)
        if new_link:
            enabled.unlink(missing_ok=True)
        raise


tls = certificate_names()
assert set(tls) <= set(names), 'Certificate contains an unexpected domain'
if args.install:
    Path('/var/www/letsencrypt/.well-known/acme-challenge').mkdir(parents=True, exist_ok=True)
    install(tls)
    if args.dns_report:
        report = json.loads(args.dns_report.read_text(encoding='utf-8'))
        checked = datetime.datetime.fromisoformat(report['checked_at'])
        assert datetime.datetime.now(datetime.timezone.utc) - checked < datetime.timedelta(minutes=30), 'Stale DNS report'
        ready_bases = report['ready_bases']
        assert set(ready_bases) <= set(bases), 'Unexpected DNS report domain'
        ready = {host for base in ready_bases for host in [base, 'www.' + base]}
        if ready - set(tls):
            assert set(tls) <= ready, 'Previously certified names are no longer ready'
            command = ['certbot', 'certonly', '--webroot', '-w', '/var/www/letsencrypt', '--non-interactive',
                       '--cert-name', 'grib-info-aliases', '--expand']
            for name in sorted(ready):
                command += ['-d', name]
            subprocess.run(command, check=True, timeout=300)
            tls = certificate_names()
            install(tls)
    print(json.dumps({'http_names': names, 'https_names': tls}))
else:
    print(render(tls))
