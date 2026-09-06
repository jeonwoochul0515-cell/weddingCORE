# -*- coding: utf-8 -*-
"""weddingCORE 네이버 검색광고 — 광고그룹·키워드·소재를 만든다.

쓰는 법
    1) 광고주센터 화면에서 캠페인을 1개 만든다(API로는 1018로 막힘)
    2) 아래 CID에 그 캠페인 id를 적는다
    3) python scripts/naver-ads-setup.py            (무엇을 만들지 보여주기만)
       python scripts/naver-ads-setup.py --apply    (실제 생성)

설계 근거는 docs/광고체계-2026-09-06.md. 키워드는 전부 5위 기준 70원으로 실측된 자리다.
"""
import io, sys, time, json

sys.path.insert(0, r'C:\Users\jeonw\.claude\skills\네이버광고\scripts')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from nv import req, keyword_results  # noqa: E402

CID = ''                                   # ← 화면에서 만든 캠페인 id를 적는다
CH = 'bsn-a001-00-000000014901237'         # 웨딩코어 비즈채널(2026-09-06 생성)
SITE = 'https://weddingcore.net'
BID = 70                                   # 실측 최저가. 이 키워드들은 5위가 70원이다

# 그룹 하나 = 사장이 처한 상황 하나. 소재와 랜딩이 그 상황에 정확히 맞아야 품질지수가 산다.
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
    {
        'name': '법 전반',
        'landing': SITE + '/law',
        'headline': '결혼중개업법 조문 지도',
        'desc': '무엇을 요구하고 어기면 어떻게 되는지 조문마다 쉬운 말로 풀었습니다.',
        'keywords': ['결혼중개업법', '국제결혼중개업교육'],
    },
]


def check():
    """만들기 전에 제약을 먼저 본다. 헤드라인 15자, 설명 45자, 가운뎃점 금지."""
    bad = False
    for g in GROUPS:
        h, d = g['headline'], g['desc']
        for label, text, limit in (('헤드라인', h, 15), ('설명', d, 45)):
            mark = 'OK ' if len(text) <= limit else '초과'
            if len(text) > limit:
                bad = True
            print(f"  {mark} {label} {len(text):>2}/{limit}  {text}")
        if '·' in h or '·' in d:
            print('  초과 가운뎃점(·)은 소재에 못 쓴다'); bad = True
    return not bad


def main():
    apply = '--apply' in sys.argv
    total_kw = sum(len(g['keywords']) for g in GROUPS)
    print(f"캠페인 {CID or '(비어 있음)'}\n비즈채널 {CH}\n그룹 {len(GROUPS)}개 · 키워드 {total_kw}개 · 입찰 {BID}원\n")
    for g in GROUPS:
        print(f"■ {g['name']}  키워드 {len(g['keywords'])}개  랜딩 {g['landing']}")
        check_ok = True
        for label, text, limit in (('헤드라인', g['headline'], 15), ('설명', g['desc'], 45)):
            over = len(text) > limit or '·' in text
            check_ok &= not over
            print(f"   {'초과' if over else 'OK  '} {label} {len(text):>2}/{limit}  {text}")
        print(f"   {', '.join(g['keywords'])}\n")
    if not check():
        print('※ 문구 제약 위반이 있다. 고치고 다시 실행할 것.')
        return
    if not apply:
        print('보여주기만 했다. 실제로 만들려면 --apply 를 붙인다.')
        return
    if not CID:
        print('CID가 비어 있다. 화면에서 캠페인을 만들고 그 id를 적을 것.')
        return

    for g in GROUPS:
        gr = req('POST', '/ncc/adgroups', None, {
            'nccCampaignId': CID, 'name': g['name'], 'adgroupType': 'WEB_SITE',
            'pcChannelId': CH, 'mobileChannelId': CH, 'bidAmt': BID})
        if 'nccAdgroupId' not in str(gr):
            print(f"[{g['name']}] 그룹 생성 실패: {json.dumps(gr, ensure_ascii=False)[:200]}")
            continue
        gid = gr['nccAdgroupId']
        print(f"[{g['name']}] 그룹 {gid}")

        kr = req('POST', '/ncc/keywords', {'nccAdgroupId': gid},
                 [{'keyword': k, 'bidAmt': BID, 'useGroupBidAmt': True} for k in g['keywords']])
        ok, ng = keyword_results(kr)     # ⚠ HTTP 200 안에 실패가 숨는다. 반드시 항목별로 본다
        print(f"   키워드 성공 {len(ok)} / 실패 {len(ng)}")
        for x in ng:
            print(f"     실패 {x.get('keyword')}: {(x.get('resultStatus') or {}).get('message')}")

        ar = req('POST', '/ncc/ads', None, {
            'nccAdgroupId': gid, 'type': 'TEXT_45',
            'ad': {'headline': g['headline'], 'description': g['desc'],
                   'pc': {'final': g['landing']}, 'mobile': {'final': g['landing']}}})
        print(f"   소재 {'생성' if 'nccAdId' in str(ar) else json.dumps(ar, ensure_ascii=False)[:200]}")
        time.sleep(0.4)


if __name__ == '__main__':
    main()
