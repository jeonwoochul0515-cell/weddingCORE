# -*- coding: utf-8 -*-
"""weddingCORE 네이버 검색광고 — 광고그룹·키워드·소재를 만든다.

캠페인은 광고주센터 화면에서 만들었다(API는 1018로 막힘). 그 캠페인 안에
퀵스타트가 만든 그룹 하나가 있고, 그것을 「법 전반」 그룹으로 이어 쓴다.

쓰는 법
    python scripts/naver-ads-setup.py            무엇을 할지 보여주기만
    python scripts/naver-ads-setup.py --apply    실제 반영

설계 근거는 docs/광고체계-2026-09-06.md. 키워드는 전부 5위 기준 70원으로 실측된 자리다.
"""
import io, sys, time, json

sys.path.insert(0, r'C:\Users\jeonw\.claude\skills\네이버광고\scripts')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from nv import req, keyword_results  # noqa: E402

CID = 'cmp-a001-01-000000011055505'          # 웨딩코어 캠페인(2026-09-06 화면에서 생성)
QUICKSTART_GID = 'grp-a001-01-000000072894849'  # 퀵스타트가 만든 그룹 → 「법 전반」으로 이어 쓴다
CH = 'bsn-a001-00-000000014901237'           # 웨딩코어 비즈채널
SITE = 'https://weddingcore.net'
BID = 70                                     # 실측 최저가. 이 키워드들은 5위가 70원이다

# 퀵스타트 그룹을 이 모습으로 바꾼다. 소재와 랜딩은 이미 맞게 들어가 있다.
REUSE = {
    'name': '법 전반',
    'keywords': ['국제결혼중개업교육'],       # 결혼중개업법은 이미 등록돼 있다
}

# 새로 만들 그룹. 그룹 하나 = 사장이 처한 상황 하나.
GROUPS = [
    {
        'name': '등록·창업',
        'landing': SITE + '/law/decree-article-2',
        'headline': '국제결혼중개업 등록기준',
        'desc': '자본금 1억원은 사무소마다 갖춰야 합니다. 조문과 해석을 한곳에서 확인하세요.',
        'keywords': ['국제결혼중개업등록기준', '결혼중개업자본금', '국제결혼중개업창업', '결혼중개업창업',
                     '결혼중개업등록', '국제결혼중개업신고', '국내결혼중개업', '국제결혼중개업',
                     '국제결혼중개업체', '국제결혼창업'],
    },
    {
        'name': '신상정보·계약',
        'landing': SITE + '/law/article-10-2',
        'headline': '신상정보 제공 의무',
        'desc': '맞선 전에 서면으로 주고 번역까지 해야 합니다. 조문과 처벌 사례를 확인하세요.',
        'keywords': ['신상정보제공', '결혼중개계약서', '결혼중개업표준약관', '결혼중개업환불',
                     '결혼중개업손해배상', '결혼중개업보증보험', '국제결혼중개수수료'],
    },
    {
        'name': '처분·영업정지',
        'landing': SITE + '/law/article-18',
        'headline': '결혼중개업 영업정지 기준',
        'desc': '어떤 위반에 며칠인지, 다툰 사례는 어떻게 됐는지 조문과 함께 정리했습니다.',
        'keywords': ['국제결혼중개업영업정지', '결혼중개업행정처분', '결혼중개업등록취소', '결혼중개업과태료',
                     '결혼중개업벌칙', '결혼중개업결격사유', '결혼중개업민원', '결혼중개업광고'],
    },
    {
        'name': '현지파트너·운영',
        'landing': SITE + '/guides/foreign-partner-banned-country',
        'headline': '현지 업체 제휴 전 확인',
        'desc': '그 나라가 결혼중개업을 금지하면 서면계약을 맺어도 제휴로 보지 않습니다.',
        'keywords': ['국제결혼중개업업무제휴', '결혼중개업통역', '국제결혼중개업지사', '결혼중개업양도',
                     '결혼중개업폐업', '결혼중개업실태조사', '여성가족부결혼중개'],
    },
]


def limits_ok(g):
    """헤드라인 15자, 설명 45자, 가운뎃점 금지. 어기면 소재 생성이 1030으로 거절된다."""
    ok = True
    for label, text, limit in (('헤드라인', g['headline'], 15), ('설명', g['desc'], 45)):
        over = len(text) > limit or '·' in text
        ok &= not over
        print(f"   {'초과' if over else 'OK  '} {label} {len(text):>2}/{limit}  {text}")
    return ok


def add_keywords(gid, kws):
    """⚠ HTTP 200 안에 실패가 숨는다. len(응답)을 성공 수로 세면 조용히 틀린다."""
    r = req('POST', '/ncc/keywords', {'nccAdgroupId': gid},
            [{'keyword': k, 'bidAmt': BID, 'useGroupBidAmt': True} for k in kws])
    ok, ng = keyword_results(r)
    print(f"   키워드 성공 {len(ok)} / 실패 {len(ng)}")
    for x in ng:
        print(f"     실패 {x.get('keyword')}: {(x.get('resultStatus') or {}).get('message')}")
    return ok, ng


def main():
    apply = '--apply' in sys.argv
    print(f"캠페인 {CID}\n비즈채널 {CH}\n입찰 {BID}원\n")
    print(f"■ 이어 쓰기 {QUICKSTART_GID} → 「{REUSE['name']}」")
    print(f"   확장검색·ADVoost Max 끄기, 그룹 하루예산 해제(캠페인 예산으로 관리)")
    print(f"   키워드 추가 {', '.join(REUSE['keywords'])}\n")
    good = True
    for g in GROUPS:
        print(f"■ 새로 {g['name']}  키워드 {len(g['keywords'])}개  랜딩 {g['landing']}")
        good &= limits_ok(g)
        print(f"   {', '.join(g['keywords'])}\n")
    if not good:
        print('※ 문구 제약 위반. 고치고 다시 실행할 것.')
        return
    if not apply:
        print('보여주기만 했다. 실제로 반영하려면 --apply 를 붙인다.')
        return

    # 1) 캠페인 자동추적 켜기 — 어느 검색어로 들어왔는지 알아야 나중에 진단이 된다.
    #    ?fields=trackingMode 는 1002로 막힌다. 전체 객체 PUT은 통과한다(전역 CLAUDE.md §13).
    c = req('GET', f'/ncc/campaigns/{CID}')
    if isinstance(c, dict) and c.get('nccCampaignId'):
        c['trackingMode'] = 'AUTO_TRACKING_MODE'
        r = req('PUT', f'/ncc/campaigns/{CID}', None, c)
        print(f"캠페인 자동추적: {r.get('trackingMode') if isinstance(r, dict) else r}")

    # 2) 퀵스타트 그룹 손질 — 확장검색을 끈다. 켜 두면 우리가 고르지 않은 말에도 나가고
    #    입찰가도 네이버가 올린다. 70원짜리 자리만 정확히 사려는 설계와 정반대다.
    g = req('GET', f'/ncc/adgroups/{QUICKSTART_GID}')
    if isinstance(g, dict) and g.get('nccAdgroupId'):
        g.update({'name': REUSE['name'], 'useExpSearch': False, 'aiAdsOptIn': False,
                  'useDailyBudget': False})
        r = req('PUT', f'/ncc/adgroups/{QUICKSTART_GID}', None, g)
        if isinstance(r, dict) and r.get('nccAdgroupId'):
            print(f"그룹 손질: 이름 {r.get('name')} · 확장검색 {r.get('useExpSearch')} · "
                  f"AI광고 {r.get('aiAdsOptIn')} · 그룹예산사용 {r.get('useDailyBudget')}")
        else:
            print('그룹 손질 실패:', json.dumps(r, ensure_ascii=False)[:300])
        add_keywords(QUICKSTART_GID, REUSE['keywords'])

    # 3) 나머지 그룹을 만든다
    for g in GROUPS:
        gr = req('POST', '/ncc/adgroups', None, {
            'nccCampaignId': CID, 'name': g['name'], 'adgroupType': 'WEB_SITE',
            'pcChannelId': CH, 'mobileChannelId': CH, 'bidAmt': BID,
            'useExpSearch': False, 'aiAdsOptIn': False, 'useDailyBudget': False})
        if not (isinstance(gr, dict) and gr.get('nccAdgroupId')):
            print(f"[{g['name']}] 그룹 생성 실패: {json.dumps(gr, ensure_ascii=False)[:300]}")
            continue
        gid = gr['nccAdgroupId']
        print(f"[{g['name']}] 그룹 {gid} · 확장검색 {gr.get('useExpSearch')}")
        add_keywords(gid, g['keywords'])
        ar = req('POST', '/ncc/ads', None, {
            'nccAdgroupId': gid, 'type': 'TEXT_45',
            'ad': {'headline': g['headline'], 'description': g['desc'],
                   'pc': {'final': g['landing']}, 'mobile': {'final': g['landing']}}})
        print(f"   소재 {ar.get('nccAdId') if isinstance(ar, dict) and ar.get('nccAdId') else json.dumps(ar, ensure_ascii=False)[:300]}")
        time.sleep(0.4)


if __name__ == '__main__':
    main()
