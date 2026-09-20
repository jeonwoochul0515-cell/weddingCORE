// 화상맞선 통화방 — 링크를 받은 사람이 로그인 없이 들어오는 화면
//
// 넷이 각자 자기 자리에서 들어온다. 신랑 후보·신부 후보·통역·담당 직원이고, 사람마다
// 다른 링크를 받는다. 그래서 누가 들어왔는지 서버가 가릴 수 있다.
//
// 이 화면이 지키는 것
//  - 토큰은 주소에 넣지 않는다. 코드를 서버에 주고 그 자리에서 받는다.
//  - 대화창·파일전송·화면공유가 없다. 토큰에서 막혀 있어 화면에 버튼을 둘 이유가 없다.
//  - 통화가 닫히면 그대로 끊긴다. 사장이 마치면 네 사람 모두 나간다.
//
// 손님이 카톡에서 링크를 누르면 앱 안 브라우저로 열린다. 거기서는 카메라·마이크가
// 막히는 기종이 있어, public/open-outside.js가 진짜 브라우저로 넘긴다.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Mic, MicOff, PhoneOff, Video as VideoIcon, VideoOff } from 'lucide-react';
import { joinVideoCall, type JoinResult } from '@/features/video/useVideoCall';

type Phase = 'ready' | 'joining' | 'live' | 'left' | 'error';

/**
 * 손님에게 보일 말로 바꾼다.
 *
 * Firebase는 연결이 안 되거나 서버가 터지면 「internal」·「unavailable」 같은 영어를
 * message에 그대로 담아 준다. 그게 화면에 뜨면 손님은 무엇을 해야 할지 모른다.
 * 서버가 우리말로 적어 보낸 사유(입장 링크가 만료되었습니다 등)는 그대로 쓴다.
 */
function humanMessage(err: unknown): string {
  const raw = (err as { message?: string }).message ?? '';
  // 한글이 하나라도 있으면 서버가 사람 말로 적어 보낸 것이다.
  if (/[가-힣]/.test(raw)) return raw;
  // 아래에 「계속 안 되면 업체에 연락」 안내가 따로 있으니 여기서 또 적지 않는다.
  return '지금은 연결이 어렵습니다. 잠시 뒤 다시 시도해 주세요.';
}

/** 한 사람의 영상 한 칸 */
type Tile = { id: string; label: string; stream: MediaStream | null; isSelf: boolean };

export default function CallRoomPage() {
  const { code = '' } = useParams();
  const [phase, setPhase] = useState<Phase>('ready');
  const [message, setMessage] = useState<string | null>(null);
  const [info, setInfo] = useState<JoinResult | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  // Room 객체는 렌더와 무관하게 살아 있어야 한다. 상태에 넣으면 재연결이 꼬인다.
  const roomRef = useRef<import('livekit-client').Room | null>(null);

  const leave = useCallback(async () => {
    await roomRef.current?.disconnect();
    roomRef.current = null;
    setTiles([]);
    setPhase('left');
  }, []);

  useEffect(() => {
    // 화면을 떠나면 반드시 끊는다. 안 끊으면 방에 유령이 남는다.
    return () => {
      void roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

  async function enter() {
    setPhase('joining');
    setMessage(null);
    try {
      const joined = await joinVideoCall(code);
      setInfo(joined);

      // 무거운 라이브러리라 들어올 때 받는다. 링크만 열어 본 사람에게까지 받게 하지 않는다.
      const { Room, RoomEvent, Track } = await import('livekit-client');
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      const refresh = () => {
        const next: Tile[] = [];
        const self = room.localParticipant;
        const selfStream = new MediaStream();
        self.trackPublications.forEach((pub) => {
          if (pub.track?.mediaStreamTrack) selfStream.addTrack(pub.track.mediaStreamTrack);
        });
        next.push({ id: self.identity, label: '나', stream: selfStream, isSelf: true });

        room.remoteParticipants.forEach((p) => {
          const stream = new MediaStream();
          p.trackPublications.forEach((pub) => {
            if (pub.track?.mediaStreamTrack) stream.addTrack(pub.track.mediaStreamTrack);
          });
          next.push({
            id: p.identity,
            // 이름에는 역할까지만 들어 있다. 서버가 그렇게 넣는다.
            label: p.name || p.identity,
            stream,
            isSelf: false,
          });
        });
        setTiles(next);
      };

      room
        .on(RoomEvent.TrackSubscribed, refresh)
        .on(RoomEvent.TrackUnsubscribed, refresh)
        .on(RoomEvent.ParticipantConnected, refresh)
        .on(RoomEvent.ParticipantDisconnected, refresh)
        .on(RoomEvent.LocalTrackPublished, refresh)
        .on(RoomEvent.Disconnected, () => {
          // 사장이 통화를 마치면 여기로 온다. 오류가 아니라 정상 종료다.
          roomRef.current = null;
          setTiles([]);
          setPhase('left');
        });

      await room.connect(joined.url, joined.token);
      await room.localParticipant.setMicrophoneEnabled(true);
      await room.localParticipant.setCameraEnabled(true);
      // Track은 위에서 함께 받아 두었지만 여기서는 쓰지 않는다. 타입만 맞춘다.
      void Track;
      refresh();
      setPhase('live');
    } catch (err) {
      setMessage(humanMessage(err));
      setPhase('error');
    }
  }

  async function toggleMic() {
    const room = roomRef.current;
    if (!room) return;
    const next = !micOn;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  }

  async function toggleCam() {
    const room = roomRef.current;
    if (!room) return;
    const next = !camOn;
    await room.localParticipant.setCameraEnabled(next);
    setCamOn(next);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-white">
      <header className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div>
          <p className="text-sm font-bold">화상맞선</p>
          {info && <p className="text-[11px] text-slate-400">내 자리 · {info.roleLabel}</p>}
        </div>
        {phase === 'live' && info?.room.recording && (
          <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-[11px] font-semibold text-red-300">
            녹화 중
          </span>
        )}
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-6">
        {phase === 'ready' && (
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center text-slate-800">
            <h1 className="text-base font-bold">화상맞선에 들어갑니다</h1>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              카메라와 마이크를 씁니다. 다음 화면에서 사용을 물으면 「허용」을 눌러 주세요.
              이 통화는 녹화되고 기록으로 보관됩니다.
            </p>
            <button type="button" onClick={enter} className="primary-button mt-4 w-full !py-2.5 text-sm">
              들어가기
            </button>
          </div>
        )}

        {phase === 'joining' && (
          <p className="flex items-center gap-2 text-sm text-slate-300">
            <Loader2 size={16} className="animate-spin" />연결하는 중…
          </p>
        )}

        {phase === 'live' && (
          <div className="grid w-full max-w-5xl gap-3 sm:grid-cols-2">
            {tiles.map((tile) => (
              <VideoTile key={tile.id} tile={tile} />
            ))}
          </div>
        )}

        {phase === 'left' && (
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center text-slate-800">
            <h1 className="text-base font-bold">통화가 끝났습니다</h1>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              창을 닫으셔도 됩니다. 다시 들어가야 하면 업체에 새 링크를 요청해 주세요.
            </p>
          </div>
        )}

        {phase === 'error' && (
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center text-slate-800">
            <h1 className="text-base font-bold">들어가지 못했습니다</h1>
            <p className="mt-2 text-xs leading-5 text-slate-600">{message}</p>
            <button type="button" onClick={enter} className="secondary-button mt-4 w-full !py-2.5 text-sm">
              다시 시도
            </button>
            <p className="mt-3 text-[11px] leading-4 text-slate-500">
              계속 안 되면 링크를 보내 준 업체에 연락해 주세요.
            </p>
          </div>
        )}
      </main>

      {phase === 'live' && (
        <footer className="flex items-center justify-center gap-3 border-t border-white/10 py-4">
          <button
            type="button"
            onClick={toggleMic}
            className={`rounded-full p-3 ${micOn ? 'bg-white/15' : 'bg-red-500/80'}`}
            aria-label={micOn ? '마이크 끄기' : '마이크 켜기'}
          >
            {micOn ? <Mic size={18} /> : <MicOff size={18} />}
          </button>
          <button
            type="button"
            onClick={toggleCam}
            className={`rounded-full p-3 ${camOn ? 'bg-white/15' : 'bg-red-500/80'}`}
            aria-label={camOn ? '카메라 끄기' : '카메라 켜기'}
          >
            {camOn ? <VideoIcon size={18} /> : <VideoOff size={18} />}
          </button>
          <button
            type="button"
            onClick={leave}
            className="rounded-full bg-red-500 p-3"
            aria-label="나가기"
          >
            <PhoneOff size={18} />
          </button>
        </footer>
      )}
    </div>
  );
}

/** 영상 한 칸. 스트림이 바뀔 때마다 video 요소에 다시 물린다 */
function VideoTile({ tile }: { tile: Tile }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && tile.stream) ref.current.srcObject = tile.stream;
  }, [tile.stream]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-800">
      <video
        ref={ref}
        autoPlay
        playsInline
        // 내 소리를 내 스피커로 내보내면 울린다.
        muted={tile.isSelf}
        className="h-full w-full object-cover"
      />
      <span className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 text-[11px]">
        {tile.label}
      </span>
    </div>
  );
}
