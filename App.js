import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StatusBar, SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './lib/supabase';

// ── THEME ──────────────────────────────────────────────────
const GOLD = '#B4A018';
const T = {
  bg:'#060606', s1:'#0E0E0E', s2:'#141414', s3:'#1C1C1C', inp:'#090909',
  b:'rgba(180,160,24,0.13)', b2:'rgba(180,160,24,0.32)',
  acc:GOLD, accM:'rgba(180,160,24,0.18)',
  tp:'#E8E8E4', ts:'#5A5A52', tt:'#2C2C28',
  ok:'#22D3A0', okM:'rgba(34,211,160,0.13)',
  er:'#F87171', erM:'rgba(248,113,113,0.13)',
  sky:'#38BDF8', pink:'#F472B6', mint:'#34D399', lav:'#A78BFA',
};

const DAYS_S = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
const DAYS_F = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
const TODAY_IDX = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();
const mkId = () => Math.random().toString(36).slice(2,7);

const shiftColor = h => {
  if(h>=5&&h<12)  return{c:GOLD,   l:'Sabah'};
  if(h>=12&&h<17) return{c:T.sky,  l:'Öğle' };
  if(h>=17&&h<22) return{c:T.lav,  l:'Akşam'};
  return{c:T.pink, l:'Gece'};
};

const toMin = t => { if(!t) return 0; const[h,m]=t.split(':').map(Number); return h*60+m; };
const overlaps = (aS,aE,bS,bE) => {
  const a0=toMin(aS),a1=toMin(aE)||1440,b0=toMin(bS),b1=toMin(bE)||1440;
  const nA=a1<a0?[[a0,1440],[0,a1]]:[[a0,a1]];
  const nB=b1<b0?[[b0,1440],[0,b1]]:[[b0,b1]];
  return nA.some(([s1,e1])=>nB.some(([s2,e2])=>s1<e2&&s2<e1));
};
const isBlocked = (avail,day,s,e) => {
  const d=avail[day]; if(!d) return false;
  if(d.type==='allday') return true;
  if(d.type==='partial') return d.blocks.some(bl=>overlaps(s,e,bl.start,bl.end));
  return false;
};

// ── HAFTA YARDIMCILARI ─────────────────────────────────────
const getWeekStart = (offset=0) => {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day===0?6:day-1) + offset*7);
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};

const getDayNum = (weekStart, dayIdx) => {
  const d = new Date(weekStart+'T12:00:00');
  d.setDate(d.getDate() + dayIdx);
  return d.getDate();
};

const formatWeekLabel = (weekStart) => {
  const d = new Date(weekStart+'T12:00:00');
  const end = new Date(d); end.setDate(end.getDate()+6);
  const M = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  return `${d.getDate()} ${M[d.getMonth()]} – ${end.getDate()} ${M[end.getMonth()]}`;
};

// ── APP ────────────────────────────────────────────────────
export default function App() {
  const [session,     setSession]     = useState(null);
  const [profile,     setProfile]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState('home');
  const [sched,       setSched]       = useState({});
  const [avail,       setAvail]       = useState({});
  const [staff,       setStaff]       = useState([]);
  const [selDay,      setSelDay]      = useState(TODAY_IDX);
  const [weekOffset,  setWeekOffset]  = useState(0);
  const [weekStart,   setWeekStart]   = useState(getWeekStart(0));
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (profile) loadAll(); }, [profile, weekStart]);

  const fetchProfile = async uid => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    setProfile(data);
    setLoading(false);
  };

  const changeWeek = dir => {
    const o = weekOffset + dir;
    setWeekOffset(o);
    setWeekStart(getWeekStart(o));
  };

  const loadAll = async () => {
    setDataLoading(true);
    await Promise.all([loadStaff(), loadShifts(), loadAvail()]);
    setDataLoading(false);
  };

  const loadStaff = async () => {
    const { data } = await supabase.from('profiles').select('*').order('name');
    setStaff(data || []);
  };

  const loadShifts = async () => {
    const { data } = await supabase
      .from('shifts')
      .select('*, shift_assignments(staff_id)')
      .eq('week_start', weekStart)
      .order('start_time');
    const grouped = {};
    (data||[]).forEach(s => {
      if (!grouped[s.day_index]) grouped[s.day_index] = [];
      grouped[s.day_index].push({
        id: s.id,
        start: s.start_time,
        end: s.end_time,
        staffIds: (s.shift_assignments||[]).map(a => a.staff_id),
      });
    });
    setSched(grouped);
  };

  const loadAvail = async () => {
    let q = supabase
      .from('availability')
      .select('*, availability_blocks(*)')
      .eq('week_start', weekStart);
    if (profile?.role === 'staff') q = q.eq('staff_id', profile.id);
    const { data } = await q;

    const toBlock = b => ({ id:b.id, start:b.start_time, end:b.end_time, reason:b.reason, note:b.note });

    if (profile?.role === 'staff') {
      const g = {};
      (data||[]).forEach(av => {
        g[av.day_index] = { type:av.type, reason:av.reason, note:av.note, blocks:(av.availability_blocks||[]).map(toBlock) };
      });
      setAvail(g);
    } else {
      // admin: avail[staffId][dayIndex]
      const g = {};
      (data||[]).forEach(av => {
        if (!g[av.staff_id]) g[av.staff_id] = {};
        g[av.staff_id][av.day_index] = { type:av.type, reason:av.reason, note:av.note, blocks:(av.availability_blocks||[]).map(toBlock) };
      });
      setAvail(g);
    }
  };

  // gs: id → profile objesi (s.i ve s.c geriye dönük uyumluluk için)
  const gs = id => {
    const s = staff.find(st => st.id === id);
    if (!s) return { name:'?', initials:'?', i:'?', color:T.sky, c:T.sky };
    return { ...s, i:s.initials, c:s.color };
  };

  const addShift = async (day, sh) => {
    const { data: shift } = await supabase
      .from('shifts')
      .insert({ week_start:weekStart, day_index:day, start_time:sh.start, end_time:sh.end })
      .select().single();
    if (!shift) return;
    if (sh.staffIds?.length > 0) {
      await supabase.from('shift_assignments').insert(
        sh.staffIds.map(sid => ({ shift_id:shift.id, staff_id:sid }))
      );
    }
    await loadShifts();
  };

  const delShift = async (day, shiftId) => {
    await supabase.from('shifts').delete().eq('id', shiftId);
    await loadShifts();
  };

  const updShift = async (day, shiftId, patch) => {
    const u = {};
    if (patch.start !== undefined) u.start_time = patch.start;
    if (patch.end   !== undefined) u.end_time   = patch.end;
    if (Object.keys(u).length > 0) await supabase.from('shifts').update(u).eq('id', shiftId);
    if (patch.staffIds !== undefined) {
      await supabase.from('shift_assignments').delete().eq('shift_id', shiftId);
      if (patch.staffIds.length > 0) {
        await supabase.from('shift_assignments').insert(
          patch.staffIds.map(sid => ({ shift_id:shiftId, staff_id:sid }))
        );
      }
    }
    await loadShifts();
  };

  const setDayAvail = async (dayIdx, val) => {
    if (!profile) return;
    if (!val) {
      await supabase.from('availability')
        .delete().eq('staff_id', profile.id).eq('week_start', weekStart).eq('day_index', dayIdx);
    } else {
      const { data: avRow } = await supabase.from('availability')
        .upsert({
          staff_id:profile.id, week_start:weekStart, day_index:dayIdx,
          type:val.type, reason:val.reason||null, note:val.note||null,
        }, { onConflict:'staff_id,week_start,day_index' })
        .select().single();
      if (avRow) {
        await supabase.from('availability_blocks').delete().eq('availability_id', avRow.id);
        if ((val.blocks||[]).length > 0) {
          await supabase.from('availability_blocks').insert(
            val.blocks.map(b => ({
              availability_id:avRow.id,
              start_time:b.start, end_time:b.end,
              reason:b.reason||null, note:b.note||null,
            }))
          );
        }
      }
    }
    await loadAvail();
  };

  const createStaff = async (name, password) => {
    const fakeEmail = `user_${Date.now()}_${Math.random().toString(36).slice(2,8)}@masalshift.internal`;
    const tmp = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession:false, autoRefreshToken:false },
    });
    const { data, error } = await tmp.auth.signUp({ email: fakeEmail, password });
    if (error || !data.user) return { error: error?.message || 'Kullanıcı oluşturulamadı' };

    const initials = name.trim().split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    const COLORS = [T.sky, T.pink, T.mint, T.lav, GOLD];
    const color = COLORS[staff.length % COLORS.length];

    const { error: pErr } = await supabase.from('profiles').insert({
      id:data.user.id, name:name.trim(), role:'staff', initials, color, email:fakeEmail,
    });
    if (pErr) return { error: pErr.message };
    await loadStaff();
    return { success: true };
  };

  // ── RENDER ───────────────────────────────────────────────
  if (loading) return (
    <SafeAreaView style={{flex:1,backgroundColor:T.bg,justifyContent:'center',alignItems:'center'}}>
      <ActivityIndicator color={T.acc} size="large"/>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{flex:1,backgroundColor:T.bg}}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg}/>
      <View style={{flex:1}}>
        {!session && <Login/>}
        {session && profile?.role==='admin' && tab==='home' && (
          <AdminHome
            sched={sched} selDay={selDay} setSelDay={setSelDay}
            gs={gs} avail={avail} staff={staff}
            addShift={addShift} delShift={delShift} updShift={updShift}
            weekStart={weekStart} weekOffset={weekOffset} changeWeek={changeWeek}
            loading={dataLoading}
          />
        )}
        {session && profile?.role==='admin' && tab==='team' && (
          <TeamView staff={staff} createStaff={createStaff}/>
        )}
        {session && profile?.role==='admin' && tab==='hours' && (
          <HoursView staff={staff}/>
        )}
        {session && profile?.role==='staff' && tab==='home' && (
          <StaffHome sched={sched} gs={gs} profile={profile} weekStart={weekStart}/>
        )}
        {session && profile?.role==='staff' && tab==='avail' && (
          <AvailView avail={avail} setDayAvail={setDayAvail} weekStart={weekStart}/>
        )}
        {session && profile?.role==='staff' && tab==='shifts' && (
          <ShiftsTableView sched={sched} gs={gs} profile={profile} weekStart={weekStart} weekOffset={weekOffset} changeWeek={changeWeek}/>
        )}
        {session && profile?.role==='staff' && tab==='notif' && (
          <NotifView profile={profile} gs={gs} loadShifts={loadShifts}/>
        )}
        {session && !profile && (
          <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:32}}>
            <Text style={{color:T.er,textAlign:'center',fontSize:15,marginBottom:20}}>
              Profilin bulunamadı. Yöneticinizle iletişime geçin.
            </Text>
            <TouchableOpacity onPress={()=>supabase.auth.signOut()}
              style={{padding:14,backgroundColor:T.s2,borderRadius:12,borderWidth:1,borderColor:T.b}}>
              <Text style={{color:T.ts}}>Çıkış Yap</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      {session && profile && (
        <Nav role={profile.role} tab={tab} setTab={setTab} onLogout={()=>supabase.auth.signOut()}/>
      )}
    </SafeAreaView>
  );
}

/* ─── LOGIN ──────────────────────────────────────────────── */
function Login() {
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const signIn = async () => {
    if (!password) { setError('Şifre gerekli'); return; }
    setLoading(true); setError('');
    const { data: profiles } = await supabase.from('profiles').select('email');
    if (!profiles?.length) { setError('Kullanıcı bulunamadı'); setLoading(false); return; }
    for (const p of profiles) {
      const { error: e } = await supabase.auth.signInWithPassword({ email: p.email, password });
      if (!e) return; // auth state değişecek, loading'i sıfırlamaya gerek yok
    }
    setError('Şifre hatalı');
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={{flex:1,backgroundColor:T.bg}} behavior={Platform.OS==='ios'?'padding':'height'}>
      <View style={{flex:1,justifyContent:'center',padding:28}}>
        <View style={{alignItems:'center',marginBottom:48}}>
          <View style={{width:64,height:64,borderRadius:20,backgroundColor:T.accM,
            borderWidth:1.5,borderColor:T.b2,justifyContent:'center',alignItems:'center',marginBottom:16}}>
            <Text style={{fontSize:28}}>🍽</Text>
          </View>
          <Text style={{color:T.tp,fontSize:26,fontWeight:'700',letterSpacing:0.5}}>MasalShift</Text>
          <Text style={{color:T.ts,fontSize:14,marginTop:4}}>Restoran Vardiya Yönetimi</Text>
        </View>
        <View style={{gap:12}}>
          <TextInput
            style={{backgroundColor:T.inp,color:T.tp,borderWidth:1,borderColor:T.b,
              borderRadius:12,padding:14,fontSize:15,textAlign:'center',letterSpacing:4}}
            placeholder="Şifre" placeholderTextColor={T.ts}
            value={password} onChangeText={setPassword}
            secureTextEntry autoFocus
          />
          {!!error && <Text style={{color:T.er,fontSize:13,textAlign:'center'}}>{error}</Text>}
          <TouchableOpacity
            style={{backgroundColor:loading?T.accM:T.acc,borderRadius:12,padding:16,alignItems:'center',marginTop:4}}
            onPress={signIn} disabled={loading}>
            {loading
              ? <ActivityIndicator color={T.acc} size="small"/>
              : <Text style={{color:'#000',fontWeight:'700',fontSize:16}}>Giriş Yap</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ─── ADMIN HOME ─────────────────────────────────────────── */
function AdminHome({sched,selDay,setSelDay,gs,avail,staff,addShift,delShift,updShift,weekStart,weekOffset,changeWeek,loading}) {
  const [form,   setForm]   = useState(false);
  const [editId, setEditId] = useState(null);
  const dayShifts = sched[selDay] || [];
  const headcount = new Set(dayShifts.flatMap(s=>s.staffIds)).size;

  return (
    <View style={{flex:1}}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',padding:20,paddingBottom:0}}>
        <View>
          <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
            <TouchableOpacity onPress={()=>changeWeek(-1)}
              style={{backgroundColor:T.s2,borderWidth:1,borderColor:T.b,borderRadius:8,paddingVertical:4,paddingHorizontal:10}}>
              <Text style={{color:T.ts,fontSize:16}}>‹</Text>
            </TouchableOpacity>
            <Chip label={weekOffset===0?'Bu hafta':formatWeekLabel(weekStart)} color={T.acc}/>
            <TouchableOpacity onPress={()=>changeWeek(1)}
              style={{backgroundColor:T.s2,borderWidth:1,borderColor:T.b,borderRadius:8,paddingVertical:4,paddingHorizontal:10}}>
              <Text style={{color:T.ts,fontSize:16}}>›</Text>
            </TouchableOpacity>
          </View>
          <Text style={{color:T.tp,fontSize:22,fontWeight:'700',marginTop:8}}>Vardiyalar</Text>
        </View>
        <TouchableOpacity onPress={()=>{setForm(true);setEditId(null);}}
          style={{backgroundColor:T.acc,borderRadius:14,paddingVertical:9,paddingHorizontal:18,marginTop:4}}>
          <Text style={{color:'#000',fontSize:13,fontWeight:'700'}}>+ Vardiya</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{marginTop:10,flexGrow:0}} contentContainerStyle={{paddingHorizontal:20,gap:7}}>
        {DAYS_S.map((d,i) => {
          const isSel=i===selDay, isToday=weekOffset===0&&i===TODAY_IDX;
          const cnt=(sched[i]||[]).reduce((a,s)=>a+s.staffIds.length,0);
          return (
            <TouchableOpacity key={i} onPress={()=>{setSelDay(i);setForm(false);setEditId(null);}}
              style={{width:50,height:64,borderRadius:16,
                backgroundColor:isSel?T.acc:T.s2,
                borderWidth:isToday&&!isSel?1.5:1,
                borderColor:isToday&&!isSel?T.acc+'50':isSel?'transparent':T.b,
                alignItems:'center',justifyContent:'center',gap:2}}>
              <Text style={{color:isSel?'rgba(0,0,0,0.65)':T.ts,fontSize:10,fontWeight:'600'}}>{d}</Text>
              <Text style={{color:isSel?'#000':T.tp,fontSize:18,fontWeight:'700',lineHeight:22}}>
                {getDayNum(weekStart,i)}
              </Text>
              <View style={{flexDirection:'row',gap:2.5}}>
                {Array.from({length:Math.min(cnt,3)}).map((_,j)=>(
                  <View key={j} style={{width:4,height:4,borderRadius:2,backgroundColor:isSel?'rgba(0,0,0,0.35)':T.acc+'60'}}/>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={{flexDirection:'row',gap:8,paddingHorizontal:20,marginTop:40}}>
        {[{l:'Vardiya',v:dayShifts.length},{l:'Çalışan',v:headcount}].map(({l,v})=>(
          <View key={l} style={{flex:1,backgroundColor:T.s2,borderRadius:14,padding:12,borderWidth:1,borderColor:T.b}}>
            <Text style={{color:T.ts,fontSize:10,letterSpacing:0.5,textTransform:'uppercase'}}>{l}</Text>
            <Text style={{color:T.tp,fontSize:24,fontWeight:'700',marginTop:4}}>{v}</Text>
          </View>
        ))}
      </View>

      {loading && <View style={{alignItems:'center',paddingTop:8}}><ActivityIndicator color={T.acc} size="small"/></View>}

      <ScrollView style={{flex:1,marginTop:12}} contentContainerStyle={{paddingHorizontal:20,paddingBottom:20}}>
        {form && (
          <ShiftForm
            init={editId ? dayShifts.find(s=>s.id===editId) : null}
            avail={avail} selDay={selDay} staff={staff}
            onSave={sh=>{editId?updShift(selDay,editId,sh):addShift(selDay,sh);setForm(false);setEditId(null);}}
            onCancel={()=>{setForm(false);setEditId(null);}}
          />
        )}
        {dayShifts.length===0&&!form&&(
          <Text style={{color:T.tt,fontSize:14,textAlign:'center',paddingTop:32}}>
            Bu gün için henüz vardiya eklenmedi
          </Text>
        )}
        {dayShifts.map(sh=>(
          <ShiftCard key={sh.id} sh={sh} gs={gs}
            onEdit={()=>{setEditId(sh.id);setForm(true);}}
            onDel={()=>delShift(selDay,sh.id)}/>
        ))}
      </ScrollView>
    </View>
  );
}

/* ─── TIME INPUT ─────────────────────────────────────────── */
function TimeInput({value,onChange,label}) {
  return (
    <View style={{flex:1}}>
      <Text style={{color:T.ts,fontSize:10,letterSpacing:0.5,marginBottom:6,textTransform:'uppercase'}}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={v=>{
          let c=v.replace(/[^0-9]/g,'');
          if(c.length>=3) c=c.slice(0,2)+':'+c.slice(2,4);
          if(c.length>5)  c=c.slice(0,5);
          onChange(c);
        }}
        placeholder="09:00" placeholderTextColor={T.ts}
        keyboardType="numeric" maxLength={5}
        style={{backgroundColor:T.inp,borderWidth:1,borderColor:T.b,borderRadius:12,
          padding:12,color:T.tp,fontSize:16,fontWeight:'600'}}
      />
    </View>
  );
}

/* ─── SHIFT FORM ─────────────────────────────────────────── */
function ShiftForm({init,avail,selDay,staff,onSave,onCancel}) {
  const [start,    setStart]    = useState(init?.start||'09:00');
  const [end,      setEnd]      = useState(init?.end||'17:00');
  const [staffIds, setStaffIds] = useState(init?.staffIds||[]);

  const checkBlocked = id => isBlocked(avail[id]||{}, selDay, start, end);
  const handleStart  = v  => { setStart(v); setStaffIds(p=>p.filter(id=>!isBlocked(avail[id]||{},selDay,v,end))); };
  const handleEnd    = v  => { setEnd(v);   setStaffIds(p=>p.filter(id=>!isBlocked(avail[id]||{},selDay,start,v))); };
  const tog = id => { if(checkBlocked(id)) return; setStaffIds(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]); };

  return (
    <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined}>
      <View style={{backgroundColor:T.s2,borderWidth:1,borderColor:T.acc+'25',borderRadius:20,padding:18,marginBottom:14}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:16}}>
          <View style={{width:3,height:14,backgroundColor:T.acc,borderRadius:2}}/>
          <Text style={{color:T.acc,fontSize:10,fontWeight:'700',letterSpacing:1.8,textTransform:'uppercase'}}>
            {init?'Vardiyayı Düzenle':'Yeni Vardiya'}
          </Text>
        </View>
        <View style={{flexDirection:'row',gap:10,marginBottom:16}}>
          <TimeInput value={start} onChange={handleStart} label="Başlangıç"/>
          <TimeInput value={end}   onChange={handleEnd}   label="Bitiş"/>
        </View>
        <Text style={{color:T.ts,fontSize:10,letterSpacing:0.5,marginBottom:10,textTransform:'uppercase'}}>Personel</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:7,marginBottom:18}}>
          {staff.map(s => {
            const blk=checkBlocked(s.id), sel=staffIds.includes(s.id);
            return (
              <TouchableOpacity key={s.id} onPress={()=>tog(s.id)} disabled={blk}
                style={{backgroundColor:blk?'#080808':sel?s.color+'20':T.s3,
                  borderWidth:1,borderColor:blk?'#1a1a2a':sel?s.color+'60':T.b,
                  borderRadius:12,paddingVertical:8,paddingHorizontal:13,
                  flexDirection:'row',alignItems:'center',gap:8,opacity:blk?0.4:1}}>
                <Av s={s} size={24}/>
                <Text style={{color:blk?T.tt:sel?s.color:T.ts,fontSize:12.5,fontWeight:'600'}}>
                  {s.name.split(' ')[0]}
                </Text>
                {blk && <Text style={{backgroundColor:T.erM,borderRadius:5,paddingHorizontal:6,paddingVertical:1,color:T.er,fontSize:9,fontWeight:'700'}}>BLOKE</Text>}
                {!blk && sel && <View style={{width:5,height:5,borderRadius:3,backgroundColor:s.color}}/>}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{flexDirection:'row',gap:8}}>
          <TouchableOpacity onPress={onCancel}
            style={{flex:1,backgroundColor:T.s3,borderWidth:1,borderColor:T.b,borderRadius:13,padding:12,alignItems:'center'}}>
            <Text style={{color:T.ts,fontSize:14,fontWeight:'600'}}>İptal</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={!staffIds.length} onPress={()=>onSave({start,end,staffIds})}
            style={{flex:2,backgroundColor:staffIds.length?T.acc:'#1a1a2e',borderRadius:13,padding:12,alignItems:'center'}}>
            <Text style={{color:staffIds.length?'#000':T.tt,fontSize:14,fontWeight:'700'}}>Kaydet</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ─── SHIFT CARD ─────────────────────────────────────────── */
function ShiftCard({sh,gs,onEdit,onDel}) {
  const {c,l} = shiftColor(parseInt(sh.start.split(':')[0]));
  return (
    <View style={{backgroundColor:T.s1,borderRadius:18,padding:15,marginBottom:10,
      borderWidth:1,borderColor:T.b,borderLeftWidth:3,borderLeftColor:c}}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
          <View style={{backgroundColor:c+'20',borderWidth:1,borderColor:c+'40',borderRadius:10,paddingVertical:4,paddingHorizontal:10}}>
            <Text style={{color:c,fontSize:11,fontWeight:'700',letterSpacing:0.5}}>{l}</Text>
          </View>
          <Text style={{color:T.tp,fontWeight:'700',fontSize:16}}>{sh.start}</Text>
          <Text style={{color:T.tt,fontSize:13}}>—</Text>
          <Text style={{color:T.tp,fontWeight:'700',fontSize:16}}>{sh.end}</Text>
        </View>
        <View style={{flexDirection:'row',gap:5}}>
          <TouchableOpacity onPress={onEdit}
            style={{backgroundColor:T.s3,borderWidth:1,borderColor:T.b,borderRadius:9,paddingVertical:5,paddingHorizontal:11}}>
            <Text style={{color:'#606058',fontSize:11.5,fontWeight:'600'}}>Düzenle</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDel}
            style={{backgroundColor:T.erM,borderWidth:1,borderColor:T.er+'30',borderRadius:9,paddingVertical:5,paddingHorizontal:11}}>
            <Text style={{color:T.er,fontSize:11.5,fontWeight:'600'}}>Sil</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
        {sh.staffIds.map(id => {
          const s = gs(id);
          return (
            <View key={id} style={{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:T.bg,borderRadius:10,paddingVertical:5,paddingHorizontal:10,borderWidth:1,borderColor:T.b}}>
              <Av s={s} size={22}/>
              <Text style={{color:'#aaa898',fontSize:12,fontWeight:'500'}}>{s.name.split(' ')[0]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ─── STAFF HOME ─────────────────────────────────────────── */
function StaffHome({sched,gs,profile,weekStart}) {
  const todayShifts  = (sched[TODAY_IDX]||[]).filter(s=>s.staffIds.includes(profile.id));
  const weekShifts   = Object.values(sched).flat().filter(s=>s.staffIds.includes(profile.id));
  const totalMins    = weekShifts.reduce((acc,s) => {
    const s0=toMin(s.start), e0=toMin(s.end)||1440;
    return acc + (e0>s0 ? e0-s0 : 1440-s0+e0);
  }, 0);

  return (
    <ScrollView style={{flex:1}} contentContainerStyle={{padding:20}}>
      <View style={{backgroundColor:T.s1,borderRadius:22,padding:20,marginBottom:22,borderWidth:1,borderColor:T.b}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:14,marginBottom:14}}>
          <View style={{width:52,height:52,borderRadius:17,backgroundColor:profile.color+'25',
            borderWidth:1.5,borderColor:profile.color+'40',alignItems:'center',justifyContent:'center'}}>
            <Text style={{fontSize:16,color:profile.color,fontWeight:'800'}}>{profile.initials}</Text>
          </View>
          <View>
            <Text style={{color:T.tp,fontWeight:'700',fontSize:20}}>Merhaba, {profile.name.split(' ')[0]} 👋</Text>
            <Text style={{color:T.ts,fontSize:13,marginTop:3}}>Personel · <Text style={{color:T.ok}}>Aktif</Text></Text>
          </View>
        </View>
        <View style={{flexDirection:'row',gap:8}}>
          {[
            {l:'BU HAFTA', v:`${weekShifts.length} vardiya`},
            {l:'TOPLAM',   v:`${Math.round(totalMins/60)} saat`, c:T.acc},
          ].map(({l,v,c})=>(
            <View key={l} style={{flex:1,backgroundColor:T.bg,borderRadius:12,padding:10,borderWidth:1,borderColor:T.b}}>
              <Text style={{color:T.ts,fontSize:9,letterSpacing:0.8,textTransform:'uppercase',marginBottom:4}}>{l}</Text>
              <Text style={{color:c||T.tp,fontSize:17,fontWeight:'700'}}>{v}</Text>
            </View>
          ))}
        </View>
      </View>

      <Chip label="Bugün" color={T.acc}/>
      <View style={{marginTop:10,marginBottom:22}}>
        {todayShifts.length===0 ? (
          <View style={{backgroundColor:T.s1,borderRadius:16,padding:18,borderWidth:1,borderColor:T.b}}>
            <Text style={{color:T.tt,fontSize:15,fontWeight:'600'}}>Bugün izin günün</Text>
          </View>
        ) : todayShifts.map(sh => {
          const {c,l} = shiftColor(parseInt(sh.start.split(':')[0]));
          const colleagues = sh.staffIds.filter(id=>id!==profile.id);
          return (
            <View key={sh.id} style={{backgroundColor:c+'12',borderWidth:1,borderColor:c+'30',borderRadius:18,padding:18,marginBottom:10}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:12}}>
                <View style={{backgroundColor:c+'25',borderRadius:9,paddingVertical:4,paddingHorizontal:10}}>
                  <Text style={{color:c,fontSize:11,fontWeight:'700',letterSpacing:0.5}}>{l}</Text>
                </View>
                <Text style={{color:T.tp,fontWeight:'700',fontSize:18}}>{sh.start} — {sh.end}</Text>
              </View>
              <Text style={{color:T.ts,fontSize:11,letterSpacing:0.5,textTransform:'uppercase',marginBottom:8}}>Ekip</Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                {colleagues.length===0
                  ? <Text style={{color:T.tt,fontSize:12}}>Tek başınasın</Text>
                  : colleagues.map(id => {
                      const s = gs(id);
                      return (
                        <View key={id} style={{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:T.bg,borderRadius:10,paddingVertical:4,paddingHorizontal:8,borderWidth:1,borderColor:T.b}}>
                          <Av s={s} size={20}/>
                          <Text style={{color:'#aaa898',fontSize:11}}>{s.name.split(' ')[0]}</Text>
                        </View>
                      );
                    })}
              </View>
            </View>
          );
        })}
      </View>

      <Chip label="Bu Hafta" color={T.acc}/>
      <View style={{marginTop:10}}>
        {DAYS_F.map((d,i) => {
          const shifts  = (sched[i]||[]).filter(s=>s.staffIds.includes(profile.id));
          const isToday = i===TODAY_IDX;
          return (
            <View key={i} style={{flexDirection:'row',alignItems:'center',
              backgroundColor:isToday?T.s2:'transparent',borderRadius:14,
              padding:10,marginBottom:4,borderWidth:1,borderColor:isToday?T.b:'transparent'}}>
              <View style={{width:34,height:34,borderRadius:11,backgroundColor:T.s2,
                borderWidth:1,borderColor:isToday?T.acc+'60':T.b,
                alignItems:'center',justifyContent:'center',marginRight:12}}>
                <Text style={{color:isToday?T.acc:T.ts,fontSize:13,fontWeight:'700'}}>{getDayNum(weekStart,i)}</Text>
              </View>
              <View style={{flex:1}}>
                <Text style={{color:isToday?T.tp:'#3a3a34',fontSize:14,fontWeight:isToday?'600':'400'}}>{d}</Text>
              </View>
              {shifts.length>0 ? (
                <View style={{alignItems:'flex-end',gap:3}}>
                  {shifts.map(sh=>{
                    const{c}=shiftColor(parseInt(sh.start.split(':')[0]));
                    return <Text key={sh.id} style={{color:c,fontSize:11,fontWeight:'600'}}>{sh.start}–{sh.end}</Text>;
                  })}
                </View>
              ) : <Text style={{color:T.tt,fontSize:12}}>İzin</Text>}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

/* ─── NOTIF VIEW ────────────────────────────────────────── */
function NotifView({profile, gs, loadShifts}) {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [acting,   setActing]   = useState(null); // id being processed

  const load = async () => {
    const { data } = await supabase
      .from('swap_requests')
      .select('*, requester_shift:requester_shift_id(start_time,end_time,day_index,week_start), target_shift:target_shift_id(start_time,end_time,day_index,week_start)')
      .eq('target_id', profile.id)
      .eq('status', 'pending')
      .order('created_at', {ascending: false});
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const respond = async (req, accept) => {
    setActing(req.id);
    if (accept) {
      // Vardiyaları değiştir
      await supabase.from('shift_assignments')
        .delete().eq('shift_id', req.requester_shift_id).eq('staff_id', req.requester_id);
      await supabase.from('shift_assignments')
        .insert({shift_id: req.requester_shift_id, staff_id: req.target_id});
      await supabase.from('shift_assignments')
        .delete().eq('shift_id', req.target_shift_id).eq('staff_id', req.target_id);
      await supabase.from('shift_assignments')
        .insert({shift_id: req.target_shift_id, staff_id: req.requester_id});
      await loadShifts();
    }
    await supabase.from('swap_requests').update({status: accept?'accepted':'rejected'}).eq('id', req.id);
    setActing(null);
    load();
  };

  const fmtShift = (req, isTarget) => {
    // Gün ve saat bilgisini swap_request'ten çekemiyoruz direkt,
    // sadece shift_id var. Requester/target bilgisini gs'den alıyoruz.
    return isTarget
      ? `${gs(req.target_id).name}'ın vardiyası`
      : `${gs(req.requester_id).name}'ın vardiyası`;
  };

  if (loading) return (
    <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
      <ActivityIndicator color={T.acc}/>
    </View>
  );

  return (
    <View style={{flex:1}}>
      <View style={{padding:20,paddingBottom:12}}>
        <Text style={{color:T.tp,fontSize:22,fontWeight:'700'}}>Bildirimler</Text>
        {requests.length>0 &&
          <Text style={{color:T.ts,fontSize:13,marginTop:3}}>{requests.length} bekleyen talep</Text>}
      </View>
      <ScrollView style={{flex:1}} contentContainerStyle={{paddingHorizontal:20,paddingBottom:20,gap:12}}>
        {requests.length===0 && (
          <View style={{alignItems:'center',paddingTop:60}}>
            <Text style={{color:T.tt,fontSize:15}}>Bekleyen bildirim yok</Text>
          </View>
        )}
        {requests.map(req => {
          const requester = gs(req.requester_id);
          const isActing = acting === req.id;
          return (
            <View key={req.id} style={{backgroundColor:T.s2,borderRadius:20,
              borderWidth:1,borderColor:T.b,padding:18}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:12,marginBottom:14}}>
                <View style={{width:46,height:46,borderRadius:14,
                  backgroundColor:(requester.c||T.sky)+'25',alignItems:'center',justifyContent:'center'}}>
                  <Text style={{color:requester.c||T.sky,fontWeight:'800',fontSize:16}}>
                    {requester.i||'?'}
                  </Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={{color:T.tp,fontWeight:'700',fontSize:15}}>
                    {requester.name} vardiya teklif etti
                  </Text>
                  <Text style={{color:T.ts,fontSize:12,marginTop:2}}>
                    {new Date(req.created_at).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
              </View>

              <View style={{backgroundColor:T.s3,borderRadius:14,padding:14,marginBottom:14}}>
                <Text style={{color:T.ts,fontSize:14,lineHeight:22}}>
                  <Text style={{color:T.tp,fontWeight:'700'}}>{requester.name}</Text>
                  {' '}
                  <Text style={{color:requester.c||T.sky,fontWeight:'600'}}>
                    {req.requester_shift ? `${DAYS_S[req.requester_shift.day_index]} ${req.requester_shift.start_time}–${req.requester_shift.end_time}` : '—'}
                  </Text>
                  {' vardiyasını senin '}
                  <Text style={{color:gs(profile.id).c||T.acc,fontWeight:'600'}}>
                    {req.target_shift ? `${DAYS_S[req.target_shift.day_index]} ${req.target_shift.start_time}–${req.target_shift.end_time}` : '—'}
                  </Text>
                  {' vardiyanla değiştirmek istiyor.'}
                </Text>
              </View>

              <View style={{flexDirection:'row',gap:10}}>
                <TouchableOpacity onPress={()=>respond(req,false)} disabled={isActing}
                  style={{flex:1,backgroundColor:T.erM,borderWidth:1,borderColor:T.er+'40',
                    borderRadius:14,padding:13,alignItems:'center'}}>
                  <Text style={{color:T.er,fontWeight:'700',fontSize:14}}>Reddet</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=>respond(req,true)} disabled={isActing}
                  style={{flex:1,backgroundColor:T.okM,borderWidth:1,borderColor:T.ok+'40',
                    borderRadius:14,padding:13,alignItems:'center'}}>
                  {isActing
                    ? <ActivityIndicator color={T.ok} size="small"/>
                    : <Text style={{color:T.ok,fontWeight:'700',fontSize:14}}>Onayla</Text>}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* ─── SHIFTS TABLE VIEW ─────────────────────────────────── */
function ShiftsTableView({sched, gs, profile, weekStart, weekOffset, changeWeek}) {
  const [modal, setModal]   = useState(null); // {targetShift, targetDayIdx, targetId}
  const [myPick, setMyPick] = useState(null); // {shift, dayIdx}
  const [sending, setSending] = useState(false);
  const [sent, setSent]     = useState(false);

  const myShifts = Object.entries(sched).flatMap(([di, shifts]) =>
    shifts.filter(sh => sh.staffIds.includes(profile.id)).map(sh => ({shift:sh, dayIdx:parseInt(di)}))
  );

  const openSwap = (sh, dayIdx, targetId) => {
    setModal({targetShift:sh, targetDayIdx:dayIdx, targetId});
    setMyPick(null); setSent(false);
  };

  const sendRequest = async () => {
    if (!modal || !myPick) return;
    setSending(true);
    await supabase.from('swap_requests').insert({
      requester_id: profile.id,
      target_id: modal.targetId,
      requester_shift_id: myPick.shift.id,
      target_shift_id: modal.targetShift.id,
      week_start: weekStart,
    });
    setSending(false); setSent(true);
    setTimeout(() => { setModal(null); setSent(false); }, 1500);
  };

  const days = DAYS_F.map((dayName, i) => ({
    dayName, dayNum: getDayNum(weekStart, i), idx: i, shifts: (sched[i] || []),
  }));

  return (
    <View style={{flex:1}}>
      <View style={{padding:20,paddingBottom:12}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8}}>
          <TouchableOpacity onPress={()=>changeWeek(-1)}
            style={{backgroundColor:T.s2,borderWidth:1,borderColor:T.b,borderRadius:8,paddingVertical:4,paddingHorizontal:10}}>
            <Text style={{color:T.ts,fontSize:16}}>‹</Text>
          </TouchableOpacity>
          <Chip label={weekOffset===0?'Bu hafta':formatWeekLabel(weekStart)} color={T.acc}/>
          <TouchableOpacity onPress={()=>changeWeek(1)}
            style={{backgroundColor:T.s2,borderWidth:1,borderColor:T.b,borderRadius:8,paddingVertical:4,paddingHorizontal:10}}>
            <Text style={{color:T.ts,fontSize:16}}>›</Text>
          </TouchableOpacity>
        </View>
        <Text style={{color:T.tp,fontSize:22,fontWeight:'700'}}>Haftalık Program</Text>
        <Text style={{color:T.ts,fontSize:12,marginTop:3}}>Birisiyle vardiya değiştirmek için adına bas</Text>
      </View>

      <ScrollView style={{flex:1}} contentContainerStyle={{paddingHorizontal:20,paddingBottom:20,gap:8}}>
        {days.map(({dayName,dayNum,idx,shifts}) => {
          const isToday = weekOffset===0 && idx===TODAY_IDX;
          return (
            <View key={idx} style={{backgroundColor:isToday?T.accM:T.s2,borderRadius:16,
              borderWidth:1,borderColor:isToday?T.acc+'40':T.b,overflow:'hidden'}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:8,
                paddingHorizontal:16,paddingVertical:12,
                borderBottomWidth:shifts.length>0?1:0,borderBottomColor:T.b}}>
                {isToday && <View style={{width:6,height:6,borderRadius:3,backgroundColor:T.acc}}/>}
                <Text style={{color:isToday?T.acc:T.tp,fontWeight:'700',fontSize:14}}>{dayName}</Text>
                <Text style={{color:T.tt,fontSize:13}}>{dayNum}</Text>
                {shifts.length===0 && <Text style={{color:T.tt,fontSize:12,marginLeft:'auto'}}>—</Text>}
              </View>
              {shifts.map((sh,j) => {
                const isMine = sh.staffIds.includes(profile.id);
                return (
                  <View key={j} style={{paddingHorizontal:16,paddingVertical:12,
                    backgroundColor:isMine?T.acc+'0D':'transparent',
                    borderBottomWidth:j<shifts.length-1?1:0,borderBottomColor:T.b+'50'}}>
                    <View style={{flexDirection:'row',alignItems:'center',marginBottom:6}}>
                      <View style={{width:3,height:20,borderRadius:2,
                        backgroundColor:isMine?T.acc:T.ts+'40',marginRight:10}}/>
                      <Text style={{color:isMine?T.acc:T.tp,fontWeight:'700',fontSize:15}}>
                        {sh.start} – {sh.end}
                      </Text>
                    </View>
                    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,paddingLeft:13}}>
                      {sh.staffIds.map(id => {
                        const s = gs(id);
                        const isMe = id === profile.id;
                        return (
                          <TouchableOpacity key={id} disabled={isMe}
                            onPress={() => openSwap(sh, idx, id)}
                            style={{flexDirection:'row',alignItems:'center',gap:5,
                              backgroundColor:(s.c||T.sky)+(isMe?'30':'15'),
                              borderRadius:8,paddingVertical:4,paddingHorizontal:10,
                              borderWidth:isMe?1:0,borderColor:(s.c||T.sky)+'60'}}>
                            <Text style={{color:s.c||T.sky,fontSize:12,fontWeight:isMe?'700':'500'}}>
                              {s.name||s.i||'?'}
                            </Text>
                            {!isMe && <Text style={{color:(s.c||T.sky)+'80',fontSize:10}}>↔</Text>}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      {/* SWAP MODAL */}
      {modal && (
        <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,
          backgroundColor:'rgba(0,0,0,0.7)',justifyContent:'flex-end'}}>
          <View style={{backgroundColor:T.s1,borderTopLeftRadius:24,borderTopRightRadius:24,
            padding:24,paddingBottom:40}}>
            <View style={{width:36,height:4,backgroundColor:T.b2,borderRadius:2,alignSelf:'center',marginBottom:20}}/>
            {sent ? (
              <View style={{alignItems:'center',padding:20}}>
                <Text style={{color:T.ok,fontSize:18,fontWeight:'700'}}>Talep Gönderildi</Text>
                <Text style={{color:T.ts,fontSize:13,marginTop:6}}>
                  {gs(modal.targetId).name} bildirim alacak
                </Text>
              </View>
            ) : (
              <>
                <Text style={{color:T.tp,fontWeight:'700',fontSize:17,marginBottom:4}}>
                  {gs(modal.targetId).name} ile vardiya değiştir
                </Text>
                <Text style={{color:T.ts,fontSize:13,marginBottom:16}}>
                  Onun: {DAYS_S[modal.targetDayIdx]} {modal.targetShift.start}–{modal.targetShift.end}
                </Text>
                <Text style={{color:T.ts,fontSize:12,fontWeight:'600',letterSpacing:0.5,marginBottom:10}}>
                  HANGİ VARDİYANI ÖNERİYORSUN?
                </Text>
                {myShifts.length === 0
                  ? <Text style={{color:T.tt,fontSize:14,marginBottom:16}}>Bu hafta vardiyanda yok</Text>
                  : myShifts.map(({shift:sh,dayIdx},i) => {
                    const sel = myPick?.shift.id === sh.id;
                    return (
                      <TouchableOpacity key={i} onPress={()=>setMyPick({shift:sh,dayIdx})}
                        style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
                          backgroundColor:sel?T.accM:T.s2,borderWidth:1,
                          borderColor:sel?T.acc:T.b,borderRadius:14,padding:14,marginBottom:8}}>
                        <Text style={{color:sel?T.acc:T.tp,fontWeight:'600'}}>
                          {DAYS_F[dayIdx]} {sh.start}–{sh.end}
                        </Text>
                        {sel && <Text style={{color:T.acc,fontSize:16}}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })
                }
                <View style={{flexDirection:'row',gap:10,marginTop:8}}>
                  <TouchableOpacity onPress={()=>setModal(null)}
                    style={{flex:1,backgroundColor:T.s2,borderWidth:1,borderColor:T.b,
                      borderRadius:14,padding:14,alignItems:'center'}}>
                    <Text style={{color:T.ts,fontWeight:'600'}}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={sendRequest}
                    disabled={!myPick||sending}
                    style={{flex:2,backgroundColor:myPick?T.acc:T.s3,
                      borderRadius:14,padding:14,alignItems:'center'}}>
                    {sending
                      ? <ActivityIndicator color={T.acc} size="small"/>
                      : <Text style={{color:myPick?'#000':T.tt,fontWeight:'700'}}>Talep Gönder</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

/* ─── AVAIL VIEW ─────────────────────────────────────────── */
function AvailView({avail,setDayAvail,weekStart}) {
  const availCnt = DAYS_F.filter((_,i)=>!avail[i]).length;
  return (
    <ScrollView style={{flex:1}} contentContainerStyle={{padding:20}}>
      <Chip label="Bu hafta" color={T.acc}/>
      <Text style={{color:T.tp,fontSize:22,fontWeight:'700',marginTop:8,marginBottom:4}}>Müsaitlik</Text>
      <View style={{flexDirection:'row',gap:10,marginBottom:22,marginTop:14}}>
        <View style={{flex:1,backgroundColor:T.s1,borderWidth:1,borderColor:T.ok+'25',borderRadius:13,padding:12}}>
          <Text style={{color:T.ok,fontSize:22,fontWeight:'700'}}>{availCnt}</Text>
          <Text style={{color:T.ts,fontSize:11,marginTop:2}}>gün müsait</Text>
        </View>
        <View style={{flex:1,backgroundColor:T.s1,borderWidth:1,borderColor:T.er+'22',borderRadius:13,padding:12}}>
          <Text style={{color:T.er,fontSize:22,fontWeight:'700'}}>{7-availCnt}</Text>
          <Text style={{color:T.ts,fontSize:11,marginTop:2}}>gün kısıtlı</Text>
        </View>
      </View>
      {DAYS_F.map((d,i)=>(
        <AvailDayRow key={i} day={d} dayNum={getDayNum(weekStart,i)} data={avail[i]} isToday={i===TODAY_IDX}
          onChange={val=>setDayAvail(i,val)}/>
      ))}
    </ScrollView>
  );
}

/* ─── AVAIL DAY ROW ──────────────────────────────────────── */
function AvailDayRow({day,dayNum,data,isToday,onChange}) {
  const REASONS = ['İzin','Hasta','Kişisel','Aile','Diğer'];
  const isAvail   = !data;
  const isAllDay  = data?.type==='allday';
  const isPartial = data?.type==='partial';

  return (
    <View style={{marginBottom:10}}>
      <View style={{flexDirection:'row',alignItems:'center',backgroundColor:T.s1,
        borderRadius:16, borderBottomLeftRadius:isAvail?16:0, borderBottomRightRadius:isAvail?16:0,
        padding:13, borderWidth:1,
        borderColor:isAvail?T.b:isAllDay?T.er+'30':T.acc+'30',
        borderBottomWidth:isAvail?1:0}}>
        <View style={{width:36,height:36,borderRadius:11,
          backgroundColor:isToday?T.acc+'20':T.s3,
          borderWidth:1,borderColor:isToday?T.acc+'50':T.b,
          alignItems:'center',justifyContent:'center',marginRight:13}}>
          <Text style={{color:isToday?T.acc:T.ts,fontSize:13,fontWeight:'700'}}>{dayNum}</Text>
        </View>
        <View style={{flex:1}}>
          <Text style={{color:isAvail?T.tp:'#443344',fontWeight:'600',fontSize:15}}>{day}</Text>
          <Text style={{fontSize:12,marginTop:2,fontWeight:'500',color:isAvail?T.ok:isAllDay?T.er:T.acc}}>
            {isAvail?'Müsait':isAllDay?'Tüm gün müsait değil':'Belirli saatler'}
          </Text>
        </View>
        <View style={{flexDirection:'row',gap:4}}>
          {[
            {k:'av', l:'Müsait',   c:T.ok,  active:isAvail,   act:()=>onChange(null)},
            {k:'all',l:'Tüm Gün', c:T.er,  active:isAllDay,  act:()=>onChange({type:'allday',reason:'İzin',note:''})},
            {k:'par',l:'Saat',    c:T.acc, active:isPartial, act:()=>onChange({type:'partial',blocks:[]})},
          ].map(({k,l,c,active,act})=>(
            <TouchableOpacity key={k} onPress={act}
              style={{backgroundColor:active?c+'18':'transparent',
                borderWidth:1,borderColor:active?c+'55':T.b,
                borderRadius:9,paddingVertical:5,paddingHorizontal:8}}>
              <Text style={{color:active?c:T.ts,fontSize:10,fontWeight:active?'700':'400'}}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isAllDay && (
        <View style={{backgroundColor:T.s2,borderWidth:1,borderColor:T.er+'22',borderTopWidth:0,
          borderBottomLeftRadius:16,borderBottomRightRadius:16,padding:14}}>
          <Text style={{color:T.ts,fontSize:9,letterSpacing:1.2,textTransform:'uppercase',fontWeight:'600',marginBottom:10}}>Mazeret</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:14}}>
            {REASONS.map(r => {
              const sel = data.reason===r;
              return (
                <TouchableOpacity key={r} onPress={()=>onChange({...data,reason:r})}
                  style={{backgroundColor:sel?T.er+'18':T.s3,borderWidth:1,borderColor:sel?T.er+'55':T.b,
                    borderRadius:9,paddingVertical:6,paddingHorizontal:13}}>
                  <Text style={{color:sel?T.er:T.ts,fontSize:12.5,fontWeight:sel?'700':'400'}}>{r}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={{color:T.ts,fontSize:9,letterSpacing:1.2,textTransform:'uppercase',fontWeight:'600',marginBottom:8}}>Not</Text>
          <TextInput
            value={data.note} onChangeText={t=>onChange({...data,note:t})}
            placeholder="Kısa bir açıklama..." placeholderTextColor={T.ts}
            multiline numberOfLines={2}
            style={{backgroundColor:T.inp,borderWidth:1,borderColor:T.b,borderRadius:12,
              padding:10,color:T.tp,fontSize:13,textAlignVertical:'top'}}
          />
        </View>
      )}

      {isPartial && (
        <View style={{backgroundColor:T.s2,borderWidth:1,borderColor:T.acc+'22',borderTopWidth:0,
          borderBottomLeftRadius:16,borderBottomRightRadius:16,padding:14}}>
          <Text style={{color:T.ts,fontSize:9,letterSpacing:1.2,textTransform:'uppercase',fontWeight:'600',marginBottom:12}}>
            Müsait olmadığım saatler
          </Text>
          {(data.blocks||[]).map(bl => (
            <View key={bl.id} style={{flexDirection:'row',alignItems:'center',backgroundColor:T.s3,
              borderRadius:12,padding:10,marginBottom:8,borderWidth:1,borderColor:T.acc+'20',
              borderLeftWidth:3,borderLeftColor:T.acc}}>
              <View style={{flex:1}}>
                <Text style={{color:T.tp,fontWeight:'700',fontSize:14}}>{bl.start} — {bl.end}</Text>
                <View style={{flexDirection:'row',alignItems:'center',gap:6,marginTop:4}}>
                  {bl.reason&&<Text style={{backgroundColor:T.s2,borderRadius:6,paddingHorizontal:8,paddingVertical:2,color:T.ts,fontSize:11}}>{bl.reason}</Text>}
                  {bl.note&&<Text style={{color:T.ts,fontSize:11,fontStyle:'italic'}}>"{bl.note}"</Text>}
                </View>
              </View>
              <TouchableOpacity onPress={()=>onChange({...data,blocks:data.blocks.filter(b=>b.id!==bl.id)})}
                style={{backgroundColor:T.erM,borderWidth:1,borderColor:T.er+'30',borderRadius:9,paddingVertical:5,paddingHorizontal:10}}>
                <Text style={{color:T.er,fontSize:11,fontWeight:'700'}}>Sil</Text>
              </TouchableOpacity>
            </View>
          ))}
          {(data.blocks||[]).length===0 && (
            <Text style={{color:T.tt,fontSize:13,marginBottom:10}}>Henüz saat aralığı eklenmedi</Text>
          )}
          <AddBlockForm onAdd={bl=>onChange({...data,blocks:[...(data.blocks||[]),{...bl,id:mkId()}]})}/>
        </View>
      )}
    </View>
  );
}

/* ─── ADD BLOCK FORM ─────────────────────────────────────── */
function AddBlockForm({onAdd}) {
  const [open,   setOpen]  = useState(false);
  const [start,  setStart] = useState('09:00');
  const [end,    setEnd]   = useState('13:00');
  const [reason, setR]     = useState('İzin');
  const [note,   setNote]  = useState('');
  const REASONS = ['İzin','Hasta','Kişisel','Aile','Diğer'];

  if (!open) return (
    <TouchableOpacity onPress={()=>setOpen(true)}
      style={{backgroundColor:'transparent',borderWidth:1,borderColor:T.acc+'45',
        borderStyle:'dashed',borderRadius:12,padding:10,alignItems:'center'}}>
      <Text style={{color:T.acc,fontSize:12,fontWeight:'700',letterSpacing:0.5}}>+ Saat Aralığı Ekle</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{backgroundColor:T.s3,borderWidth:1,borderColor:T.acc+'25',borderRadius:13,padding:14}}>
      <View style={{flexDirection:'row',gap:10,marginBottom:12}}>
        <TimeInput value={start} onChange={setStart} label="Başlangıç"/>
        <TimeInput value={end}   onChange={setEnd}   label="Bitiş"/>
      </View>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:5,marginBottom:10}}>
        {REASONS.map(r => {
          const sel = reason===r;
          return (
            <TouchableOpacity key={r} onPress={()=>setR(r)}
              style={{backgroundColor:sel?T.accM:T.s2,borderWidth:1,borderColor:sel?T.acc+'55':T.b,
                borderRadius:8,paddingVertical:5,paddingHorizontal:11}}>
              <Text style={{color:sel?T.acc:T.ts,fontSize:11.5,fontWeight:sel?'700':'400'}}>{r}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TextInput value={note} onChangeText={setNote} placeholder="Not (opsiyonel)" placeholderTextColor={T.ts}
        style={{backgroundColor:T.inp,borderWidth:1,borderColor:T.b,borderRadius:10,
          padding:10,color:T.tp,fontSize:13,marginBottom:12}}/>
      <View style={{flexDirection:'row',gap:8}}>
        <TouchableOpacity onPress={()=>setOpen(false)}
          style={{flex:1,backgroundColor:T.s2,borderWidth:1,borderColor:T.b,borderRadius:10,padding:10,alignItems:'center'}}>
          <Text style={{color:T.ts,fontSize:13,fontWeight:'600'}}>İptal</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=>{onAdd({start,end,reason,note});setOpen(false);setNote('');}}
          style={{flex:2,backgroundColor:T.acc,borderRadius:10,padding:10,alignItems:'center'}}>
          <Text style={{color:'#000',fontSize:13,fontWeight:'700'}}>Ekle</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ─── HOURS VIEW ────────────────────────────────────────── */
function HoursView({staff}) {
  const [period,  setPeriod]  = useState('weekly');
  const [data,    setData]    = useState({});
  const [fetching,setFetching]= useState(false);

  const pad  = n => String(n).padStart(2,'0');
  const toMins = t => { const [h,m]=t.split(':').map(Number); return h*60+m; };
  const diff   = (s,e) => Math.max(0, toMins(e)-toMins(s));
  const fmt    = mins => { const h=Math.floor(mins/60),m=mins%60; return m>0?`${h}s ${m}dk`:`${h}s`; };

  // Takvim sınırları — yerel saat, UTC yok
  const getBounds = () => {
    const now = new Date();
    const localToday = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    const nowM = now.getHours()*60+now.getMinutes();

    // Pazartesi (bu hafta)
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow===0?6:dow-1));
    const weekStart = `${monday.getFullYear()}-${pad(monday.getMonth()+1)}-${pad(monday.getDate())}`;

    // Bu ay
    const monthStart = `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    const monthEnd = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(lastDay)}`;

    return { localToday, nowM, weekStart, monthStart, monthEnd };
  };

  // Vardiya bitti mi?
  const ended = (weekStartStr, dayIndex, endTime, localToday, nowM) => {
    const d = new Date(weekStartStr + 'T12:00:00');
    d.setDate(d.getDate() + dayIndex);
    const sd = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    if (sd < localToday) return true;
    if (sd === localToday) return toMins(endTime) <= nowM;
    return false;
  };

  useEffect(() => {
    setFetching(true);
    const { localToday, nowM, weekStart, monthStart, monthEnd } = getBounds();

    const rangeStart = period==='monthly' ? monthStart : weekStart;
    const rangeEnd   = period==='monthly' ? monthEnd   : weekStart;

    supabase
      .from('shifts')
      .select('week_start,day_index,start_time,end_time,shift_assignments(staff_id)')
      .gte('week_start', rangeStart)
      .lte('week_start', rangeEnd)
      .then(({data: rows}) => {
        const map = {};
        (rows||[]).forEach(sh => {
          // Günlük: sadece bugünün vardiyaları
          if (period==='daily') {
            const d = new Date(sh.week_start + 'T12:00:00');
            d.setDate(d.getDate() + sh.day_index);
            const sd = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
            if (sd !== localToday) return;
          }
          if (!ended(sh.week_start, sh.day_index, sh.end_time, localToday, nowM)) return;
          const mins = diff(sh.start_time, sh.end_time);
          (sh.shift_assignments||[]).forEach(a => {
            map[a.staff_id] = (map[a.staff_id]||0) + mins;
          });
        });
        setData(map);
        setFetching(false);
      });
  }, [period]);

  const getMins = id => data[id] || 0;
  const sorted = [...staff].sort((a,b) => getMins(b.id)-getMins(a.id));

  return (
    <View style={{flex:1}}>
      <View style={{padding:20,paddingBottom:0}}>
        <Text style={{color:T.tp,fontSize:22,fontWeight:'700',marginBottom:14}}>Çalışma Saatleri</Text>
        <View style={{flexDirection:'row',backgroundColor:T.s2,borderRadius:14,padding:4,borderWidth:1,borderColor:T.b}}>
          {[{k:'daily',l:'Günlük'},{k:'weekly',l:'Haftalık'},{k:'monthly',l:'Aylık'}].map(p=>(
            <TouchableOpacity key={p.k} onPress={()=>setPeriod(p.k)} style={{flex:1,
              backgroundColor:period===p.k?T.acc:'transparent',
              borderRadius:11,paddingVertical:8,alignItems:'center'}}>
              <Text style={{color:period===p.k?'#000':T.ts,fontSize:13,fontWeight:'600'}}>{p.l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {fetching
        ? <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><ActivityIndicator color={T.acc}/></View>
        : <ScrollView style={{flex:1}} contentContainerStyle={{padding:20,gap:10}}>
            {sorted.map(s => {
              const mins = getMins(s.id);
              const maxMins = getMins(sorted[0]?.id) || 1;
              const pct = mins/maxMins;
              return (
                <View key={s.id} style={{backgroundColor:T.s2,borderRadius:16,padding:16,
                  borderWidth:1,borderColor:T.b}}>
                  <View style={{flexDirection:'row',alignItems:'center',gap:12,marginBottom:10}}>
                    <View style={{width:40,height:40,borderRadius:12,
                      backgroundColor:(s.color||T.sky)+'25',alignItems:'center',justifyContent:'center'}}>
                      <Text style={{color:s.color||T.sky,fontWeight:'800',fontSize:14}}>{s.initials||'?'}</Text>
                    </View>
                    <View style={{flex:1}}>
                      <Text style={{color:T.tp,fontWeight:'600',fontSize:15}}>{s.name}</Text>
                      <Text style={{color:T.ts,fontSize:12}}>{s.role==='admin'?'Yönetici':'Personel'}</Text>
                    </View>
                    <Text style={{color:mins>0?T.acc:T.tt,fontWeight:'700',fontSize:18}}>
                      {mins>0 ? fmt(mins) : '—'}
                    </Text>
                  </View>
                  <View style={{height:4,backgroundColor:T.s3,borderRadius:2}}>
                    <View style={{height:4,borderRadius:2,
                      backgroundColor:(s.color||T.acc),width:`${Math.round(pct*100)}%`}}/>
                  </View>
                </View>
              );
            })}
          </ScrollView>
      }
    </View>
  );
}

/* ─── TEAM VIEW ──────────────────────────────────────────── */
function TeamView({staff, createStaff}) {
  const [showForm, setShowForm] = useState(false);
  const [name,     setName]     = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const submit = async () => {
    if (!name||!password) { setError('İsim ve şifre zorunlu'); return; }
    setLoading(true); setError('');
    const result = await createStaff(name, password);
    if (result.error) setError(result.error);
    else { setName(''); setPassword(''); setShowForm(false); }
    setLoading(false);
  };

  return (
    <ScrollView style={{flex:1}} contentContainerStyle={{padding:20}}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <View>
          <Chip label={`${staff.length} aktif`} color={T.ok}/>
          <Text style={{color:T.tp,fontSize:22,fontWeight:'700',marginTop:8}}>Ekip</Text>
        </View>
        <TouchableOpacity onPress={()=>{setShowForm(!showForm);setError('');}}
          style={{backgroundColor:showForm?T.s2:T.acc,borderRadius:14,paddingVertical:9,paddingHorizontal:18,marginTop:4,
            borderWidth:showForm?1:0,borderColor:T.b}}>
          <Text style={{color:showForm?T.ts:'#000',fontSize:13,fontWeight:'700'}}>{showForm?'İptal':'+ Ekle'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={{backgroundColor:T.s2,borderWidth:1,borderColor:T.acc+'25',borderRadius:20,padding:18,marginBottom:20}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:16}}>
            <View style={{width:3,height:14,backgroundColor:T.acc,borderRadius:2}}/>
            <Text style={{color:T.acc,fontSize:10,fontWeight:'700',letterSpacing:1.8,textTransform:'uppercase'}}>YENİ PERSONEL</Text>
          </View>
          {[
            {ph:'Ad Soyad', val:name,     fn:setName,     cap:'words',  kb:'default'},
            {ph:'Şifre',    val:password, fn:setPassword, cap:'none',   kb:'default', sec:true},
          ].map((f,i)=>(
            <TextInput key={i}
              style={{backgroundColor:T.inp,color:T.tp,borderWidth:1,borderColor:T.b,
                borderRadius:12,padding:13,fontSize:14,marginBottom:10}}
              placeholder={f.ph} placeholderTextColor={T.ts}
              value={f.val} onChangeText={f.fn}
              autoCapitalize={f.cap} keyboardType={f.kb} secureTextEntry={!!f.sec}
            />
          ))}
          {!!error && <Text style={{color:T.er,fontSize:12,marginBottom:10}}>{error}</Text>}
          <TouchableOpacity onPress={submit} disabled={loading}
            style={{backgroundColor:loading?T.accM:T.acc,borderRadius:12,padding:13,alignItems:'center'}}>
            {loading
              ? <ActivityIndicator color={T.acc} size="small"/>
              : <Text style={{color:'#000',fontWeight:'700',fontSize:14}}>Oluştur</Text>}
          </TouchableOpacity>
        </View>
      )}

      {staff.map(s => (
        <View key={s.id} style={{flexDirection:'row',alignItems:'center',gap:14,
          backgroundColor:T.s1,borderRadius:18,padding:15,marginBottom:10,borderWidth:1,borderColor:T.b}}>
          <View style={{width:46,height:46,borderRadius:14,backgroundColor:s.color+'20',
            borderWidth:1,borderColor:s.color+'35',alignItems:'center',justifyContent:'center'}}>
            <Text style={{fontSize:13,color:s.color,fontWeight:'800'}}>{s.initials}</Text>
          </View>
          <View style={{flex:1}}>
            <Text style={{color:T.tp,fontWeight:'600',fontSize:15}}>{s.name}</Text>
            <Text style={{color:T.ts,fontSize:12,marginTop:2}}>{s.role==='admin'?'Yönetici':'Personel'}</Text>
          </View>
          <View style={{backgroundColor:T.okM,borderWidth:1,borderColor:T.ok+'30',borderRadius:9,paddingVertical:4,paddingHorizontal:11}}>
            <Text style={{color:T.ok,fontSize:11,fontWeight:'700'}}>Aktif</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

/* ─── BOTTOM NAV ─────────────────────────────────────────── */
function Nav({role,tab,setTab,onLogout}) {
  const tabs = role==='admin'
    ? [{k:'home',l:'Vardiyalar'},{k:'hours',l:'Saatler'},{k:'team',l:'Ekip'}]
    : [{k:'home',l:'Vardiyam'},{k:'shifts',l:'Tablo'},{k:'avail',l:'Müsaitlik'},{k:'notif',l:'Bildirim'}];
  return (
    <View style={{backgroundColor:T.s1,borderTopWidth:1,borderTopColor:T.b,
      paddingTop:10,paddingBottom:Platform.OS==='ios'?24:12,paddingHorizontal:24,
      flexDirection:'row',gap:6}}>
      {tabs.map(t=>(
        <TouchableOpacity key={t.k} onPress={()=>setTab(t.k)}
          style={{flex:1,paddingVertical:10,
            backgroundColor:tab===t.k?T.acc:'transparent',
            borderWidth:1,borderColor:tab===t.k?T.acc+'80':T.b,
            borderRadius:16,alignItems:'center',gap:5}}>
          <View style={{width:5,height:5,borderRadius:3,backgroundColor:tab===t.k?'rgba(0,0,0,0.6)':T.acc+'50'}}/>
          <Text style={{color:tab===t.k?'#000':T.ts,fontSize:11,fontWeight:'600',letterSpacing:0.3}}>{t.l}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity onPress={onLogout}
        style={{width:52,backgroundColor:T.s2,borderWidth:1,borderColor:T.b,
          borderRadius:16,alignItems:'center',gap:5,paddingVertical:10}}>
        <View style={{width:5,height:5,borderRadius:3,backgroundColor:T.tt}}/>
        <Text style={{color:T.ts,fontSize:11,fontWeight:'600'}}>Çıkış</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ─── UTILS ──────────────────────────────────────────────── */
function Av({s, size=24}) {
  const initials = s.initials || s.i || '?';
  const color    = s.color    || s.c || T.sky;
  return (
    <View style={{width:size,height:size,borderRadius:Math.round(size*.32),
      backgroundColor:color+'25',alignItems:'center',justifyContent:'center'}}>
      <Text style={{fontSize:size*.38,color,fontWeight:'800'}}>{initials}</Text>
    </View>
  );
}

function Chip({label, color}) {
  return (
    <View style={{flexDirection:'row',alignItems:'center',gap:6,
      backgroundColor:color+'15',borderWidth:1,borderColor:color+'30',
      borderRadius:8,paddingVertical:4,paddingHorizontal:10,alignSelf:'flex-start'}}>
      <View style={{width:5,height:5,borderRadius:3,backgroundColor:color}}/>
      <Text style={{color,fontSize:11,fontWeight:'700',letterSpacing:0.5}}>{label.toUpperCase()}</Text>
    </View>
  );
}
