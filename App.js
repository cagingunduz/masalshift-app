import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StatusBar, SafeAreaView, Image, KeyboardAvoidingView, Platform,
} from 'react-native';

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

const STAFF = [
  {id:1,name:'Ali Koç',     role:'Garson', i:'AK',c:T.sky },
  {id:2,name:'Selin Arslan',role:'Aşçı',   i:'SA',c:T.pink},
  {id:3,name:'Mert Yıldız', role:'Barista',i:'MY',c:T.mint},
  {id:4,name:'Zeynep Öz',   role:'Garson', i:'ZÖ',c:GOLD  },
  {id:5,name:'Can Demir',   role:'Host',   i:'CD',c:T.lav },
];

const DAYS_S=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
const DAYS_F=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
const TODAY=2;
const mkId=()=>Math.random().toString(36).slice(2,7);

const shiftColor=h=>{
  if(h>=5&&h<12) return{c:GOLD,  l:'Sabah'};
  if(h>=12&&h<17)return{c:T.sky, l:'Öğle' };
  if(h>=17&&h<22)return{c:T.lav, l:'Akşam'};
  return{c:T.pink,l:'Gece'};
};
const toMin=t=>{if(!t)return 0;const[h,m]=t.split(':').map(Number);return h*60+m;};
const overlaps=(aS,aE,bS,bE)=>{
  const a0=toMin(aS),a1=toMin(aE)||1440,b0=toMin(bS),b1=toMin(bE)||1440;
  const nA=a1<a0?[[a0,1440],[0,a1]]:[[a0,a1]];
  const nB=b1<b0?[[b0,1440],[0,b1]]:[[b0,b1]];
  return nA.some(([s1,e1])=>nB.some(([s2,e2])=>s1<e2&&s2<e1));
};
const isBlocked=(avail,day,s,e)=>{
  const d=avail[day];if(!d)return false;
  if(d.type==='allday')return true;
  if(d.type==='partial')return d.blocks.some(bl=>overlaps(s,e,bl.start,bl.end));
  return false;
};

const INIT_SCHED={
  0:[{id:mkId(),start:'08:00',end:'16:00',staffIds:[1,2]},{id:mkId(),start:'16:00',end:'00:00',staffIds:[3,4]}],
  1:[{id:mkId(),start:'09:00',end:'17:00',staffIds:[1,3]},{id:mkId(),start:'17:00',end:'01:00',staffIds:[2,5]}],
  2:[{id:mkId(),start:'07:30',end:'15:30',staffIds:[2,4]},{id:mkId(),start:'15:30',end:'23:30',staffIds:[1,3]},{id:mkId(),start:'23:30',end:'07:30',staffIds:[5]}],
  3:[{id:mkId(),start:'08:00',end:'16:00',staffIds:[1,5]},{id:mkId(),start:'16:00',end:'00:00',staffIds:[2,4]}],
  4:[{id:mkId(),start:'10:00',end:'18:00',staffIds:[3,4]},{id:mkId(),start:'18:00',end:'02:00',staffIds:[1,2,5]}],
  5:[{id:mkId(),start:'09:00',end:'17:00',staffIds:[1,2,3]},{id:mkId(),start:'17:00',end:'01:00',staffIds:[4,5]}],
  6:[{id:mkId(),start:'10:00',end:'18:00',staffIds:[2,3]},{id:mkId(),start:'18:00',end:'02:00',staffIds:[1,4]}],
};
const INIT_AVAIL={
  0:null,1:null,
  2:{type:'allday',reason:'İzin',note:'Doktor randevum var'},
  3:{type:'partial',blocks:[{id:mkId(),start:'09:00',end:'14:00',reason:'Hasta',note:'Fizyo randevum'}]},
  4:null,5:null,
  6:{type:'allday',reason:'Kişisel',note:''},
};

export default function App(){
  const[role,setRole]=useState(null);
  const[tab,setTab]=useState('home');
  const[sched,setSched]=useState(INIT_SCHED);
  const[avail,setAvail]=useState(INIT_AVAIL);
  const[selDay,setSelDay]=useState(TODAY);

  const gs=id=>STAFF.find(s=>s.id===id)||STAFF[0];
  const addShift=(day,sh)=>setSched(p=>({...p,[day]:[...(p[day]||[]),{...sh,id:mkId()}]}));
  const delShift=(day,sid)=>setSched(p=>({...p,[day]:p[day].filter(s=>s.id!==sid)}));
  const updShift=(day,sid,patch)=>setSched(p=>({...p,[day]:p[day].map(s=>s.id===sid?{...s,...patch}:s)}));
  const setDayAvail=(i,val)=>setAvail(p=>({...p,[i]:val}));

  return(
    <SafeAreaView style={{flex:1,backgroundColor:T.bg}}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg}/>
      <View style={{flex:1}}>
        {!role&&<Login onSelect={r=>{setRole(r);setTab('home');}}/>}
        {role==='admin'&&tab==='home'&&<AdminHome sched={sched} selDay={selDay} setSelDay={setSelDay} gs={gs} avail={avail} addShift={addShift} delShift={delShift} updShift={updShift}/>}
        {role==='admin'&&tab==='team'&&<TeamView/>}
        {role==='staff'&&tab==='home'&&<StaffHome sched={sched} gs={gs}/>}
        {role==='staff'&&tab==='avail'&&<AvailView avail={avail} setDayAvail={setDayAvail}/>}
      </View>
      {role&&<Nav role={role} tab={tab} setTab={setTab} onLogout={()=>{setRole(null);setTab('home');}}/>}
    </SafeAreaView>
  );
}

/* ─── LOGIN ─────────────────────────────────────────────── */
function Login({onSelect}){
  return(
    <ScrollView style={{flex:1,backgroundColor:T.bg}} contentContainerStyle={{padding:28}}>
      <View style={{marginBottom:40,marginTop:12}}>
        <Image
          source={{uri:'data:image/jpeg;base64,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'}}
          style={{width:160,height:70,resizeMode:'contain',marginBottom:16}}
        />
        <Text style={{color:T.tp,fontSize:22,fontWeight:'700',letterSpacing:-0.5}}>Masal Shift Manager</Text>
        <Text style={{color:T.ts,fontSize:13,marginTop:6}}>Restoran vardiya yönetimi</Text>
      </View>

      <Text style={{color:T.tt,fontSize:10,letterSpacing:2,textTransform:'uppercase',marginBottom:16,fontWeight:'600'}}>
        Hesap türünü seçin
      </Text>

      {[
        {r:'admin',label:'Yönetici',desc:'Vardiya oluştur · Ekibi yönet',dot:T.acc},
        {r:'staff', label:'Personel',desc:'Vardiyamı gör · Müsaitliğimi belirt',dot:T.ok},
      ].map(({r,label,desc,dot})=>(
        <TouchableOpacity key={r} onPress={()=>onSelect(r)}
          style={{backgroundColor:T.s1,borderWidth:1,borderColor:T.b,borderRadius:20,padding:20,marginBottom:14,flexDirection:'row',alignItems:'center',gap:16}}>
          <View style={{width:48,height:48,borderRadius:15,backgroundColor:dot+'18',borderWidth:1,borderColor:dot+'30',alignItems:'center',justifyContent:'center'}}>
            <View style={{width:14,height:14,borderRadius:7,backgroundColor:dot}}/>
          </View>
          <View style={{flex:1}}>
            <Text style={{color:T.tp,fontWeight:'700',fontSize:17}}>{label}</Text>
            <Text style={{color:T.ts,fontSize:12.5,marginTop:4}}>{desc}</Text>
          </View>
          <Text style={{color:T.tt,fontSize:22}}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

/* ─── ADMIN HOME ─────────────────────────────────────────── */
function AdminHome({sched,selDay,setSelDay,gs,avail,addShift,delShift,updShift}){
  const[form,setForm]=useState(false);
  const[editId,setEditId]=useState(null);
  const dayShifts=sched[selDay]||[];
  const headcount=new Set(dayShifts.flatMap(s=>s.staffIds)).size;

  return(
    <View style={{flex:1}}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',padding:20,paddingBottom:0}}>
        <View>
          <Chip label="Bu hafta" color={T.acc}/>
          <Text style={{color:T.tp,fontSize:22,fontWeight:'700',marginTop:8}}>Vardiyalar</Text>
        </View>
        <TouchableOpacity onPress={()=>{setForm(true);setEditId(null);}}
          style={{backgroundColor:T.acc,borderRadius:14,paddingVertical:9,paddingHorizontal:18,marginTop:4}}>
          <Text style={{color:'#000',fontSize:13,fontWeight:'700'}}>+ Vardiya</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{marginTop:16}} contentContainerStyle={{paddingHorizontal:20,gap:7}}>
        {DAYS_S.map((d,i)=>{
          const isSel=i===selDay,isToday=i===TODAY;
          const cnt=(sched[i]||[]).reduce((a,s)=>a+s.staffIds.length,0);
          return(
            <TouchableOpacity key={i} onPress={()=>{setSelDay(i);setForm(false);setEditId(null);}}
              style={{width:50,height:64,borderRadius:16,
                backgroundColor:isSel?T.acc:T.s2,
                borderWidth:isToday&&!isSel?1.5:1,
                borderColor:isToday&&!isSel?T.acc+'50':isSel?'transparent':T.b,
                alignItems:'center',justifyContent:'center',gap:2}}>
              <Text style={{color:isSel?'rgba(0,0,0,0.65)':T.ts,fontSize:10,fontWeight:'600'}}>{d}</Text>
              <Text style={{color:isSel?'#000':T.tp,fontSize:18,fontWeight:'700',lineHeight:22}}>{i+11}</Text>
              <View style={{flexDirection:'row',gap:2.5}}>
                {Array.from({length:Math.min(cnt,3)}).map((_,j)=>(
                  <View key={j} style={{width:4,height:4,borderRadius:2,backgroundColor:isSel?'rgba(0,0,0,0.35)':T.acc+'60'}}/>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={{flexDirection:'row',gap:8,paddingHorizontal:20,marginTop:12}}>
        {[{l:'Vardiya',v:dayShifts.length},{l:'Çalışan',v:headcount}].map(({l,v})=>(
          <View key={l} style={{flex:1,backgroundColor:T.s2,borderRadius:14,padding:12,borderWidth:1,borderColor:T.b}}>
            <Text style={{color:T.ts,fontSize:10,letterSpacing:0.5,textTransform:'uppercase'}}>{l}</Text>
            <Text style={{color:T.tp,fontSize:24,fontWeight:'700',marginTop:4}}>{v}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={{flex:1,marginTop:12}} contentContainerStyle={{paddingHorizontal:20,paddingBottom:20}}>
        {form&&(
          <ShiftForm
            init={editId?dayShifts.find(s=>s.id===editId):null}
            avail={avail} selDay={selDay}
            onSave={sh=>{editId?updShift(selDay,editId,sh):addShift(selDay,sh);setForm(false);setEditId(null);}}
            onCancel={()=>{setForm(false);setEditId(null);}}
          />
        )}
        {dayShifts.length===0&&!form&&(
          <Text style={{color:T.tt,fontSize:14,textAlign:'center',paddingTop:32}}>Bu gün için henüz vardiya eklenmedi</Text>
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
function TimeInput({value,onChange,label}){
  return(
    <View style={{flex:1}}>
      <Text style={{color:T.ts,fontSize:10,letterSpacing:0.5,marginBottom:6,textTransform:'uppercase'}}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={v=>{
          let clean=v.replace(/[^0-9]/g,'');
          if(clean.length>=3) clean=clean.slice(0,2)+':'+clean.slice(2,4);
          if(clean.length>5) clean=clean.slice(0,5);
          onChange(clean);
        }}
        placeholder="09:00"
        placeholderTextColor={T.ts}
        keyboardType="numeric"
        maxLength={5}
        style={{backgroundColor:T.inp,borderWidth:1,borderColor:T.b,borderRadius:12,
          padding:12,color:T.tp,fontSize:16,fontWeight:'600'}}
      />
    </View>
  );
}

/* ─── SHIFT FORM ─────────────────────────────────────────── */
function ShiftForm({init,avail,selDay,onSave,onCancel}){
  const[start,setStart]=useState(init?.start||'09:00');
  const[end,setEnd]=useState(init?.end||'17:00');
  const[staffIds,setStaffIds]=useState(init?.staffIds||[]);

  const checkBlocked=id=>id===1?isBlocked(avail,selDay,start,end):false;
  const handleStart=v=>{setStart(v);setStaffIds(prev=>prev.filter(id=>!isBlocked(avail,selDay,v,end)));};
  const handleEnd=v=>{setEnd(v);setStaffIds(prev=>prev.filter(id=>!isBlocked(avail,selDay,start,v)));};
  const tog=id=>{if(checkBlocked(id))return;setStaffIds(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);};

  return(
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
          <TimeInput value={end} onChange={handleEnd} label="Bitiş"/>
        </View>

        <Text style={{color:T.ts,fontSize:10,letterSpacing:0.5,marginBottom:10,textTransform:'uppercase'}}>Personel</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:7,marginBottom:18}}>
          {STAFF.map(s=>{
            const blk=checkBlocked(s.id),sel=staffIds.includes(s.id);
            return(
              <TouchableOpacity key={s.id} onPress={()=>tog(s.id)} disabled={blk}
                style={{backgroundColor:blk?'#080808':sel?s.c+'20':T.s3,
                  borderWidth:1,borderColor:blk?'#1a1a2a':sel?s.c+'60':T.b,
                  borderRadius:12,paddingVertical:8,paddingHorizontal:13,
                  flexDirection:'row',alignItems:'center',gap:8,opacity:blk?0.4:1}}>
                <Av s={s} size={24}/>
                <Text style={{color:blk?T.tt:sel?s.c:T.ts,fontSize:12.5,fontWeight:'600'}}>
                  {s.name.split(' ')[0]}
                </Text>
                {blk&&<Text style={{backgroundColor:T.erM,borderRadius:5,paddingHorizontal:6,paddingVertical:1,color:T.er,fontSize:9,fontWeight:'700'}}>BLOKE</Text>}
                {!blk&&sel&&<View style={{width:5,height:5,borderRadius:3,backgroundColor:s.c}}/>}
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
function ShiftCard({sh,gs,onEdit,onDel}){
  const{c,l}=shiftColor(parseInt(sh.start.split(':')[0]));
  return(
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
        {sh.staffIds.map(id=>{const s=gs(id);return(
          <View key={id} style={{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:T.bg,borderRadius:10,paddingVertical:5,paddingHorizontal:10,borderWidth:1,borderColor:T.b}}>
            <Av s={s} size={22}/>
            <Text style={{color:'#aaa898',fontSize:12,fontWeight:'500'}}>{s.name.split(' ')[0]}</Text>
          </View>
        );})}
      </View>
    </View>
  );
}

/* ─── STAFF HOME ─────────────────────────────────────────── */
function StaffHome({sched,gs}){
  const me=gs(1);
  const todayShifts=(sched[TODAY]||[]).filter(s=>Array.isArray(s.staffIds)&&s.staffIds.includes(1));
  return(
    <ScrollView style={{flex:1}} contentContainerStyle={{padding:20}}>
      <View style={{backgroundColor:T.s1,borderRadius:22,padding:20,marginBottom:22,borderWidth:1,borderColor:T.b}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:14,marginBottom:14}}>
          <View style={{width:52,height:52,borderRadius:17,backgroundColor:me.c+'25',borderWidth:1.5,borderColor:me.c+'40',alignItems:'center',justifyContent:'center'}}>
            <Text style={{fontSize:16,color:me.c,fontWeight:'800'}}>{me.i}</Text>
          </View>
          <View>
            <Text style={{color:T.tp,fontWeight:'700',fontSize:20}}>Merhaba, {me.name.split(' ')[0]} 👋</Text>
            <Text style={{color:T.ts,fontSize:13,marginTop:3}}>{me.role} · <Text style={{color:T.ok}}>Aktif</Text></Text>
          </View>
        </View>
        <View style={{flexDirection:'row',gap:8}}>
          {[{l:'BU HAFTA',v:'5 vardiya'},{l:'TOPLAM',v:'38 saat',c:T.acc}].map(({l,v,c})=>(
            <View key={l} style={{flex:1,backgroundColor:T.bg,borderRadius:12,padding:10,borderWidth:1,borderColor:T.b}}>
              <Text style={{color:T.ts,fontSize:9,letterSpacing:0.8,textTransform:'uppercase',marginBottom:4}}>{l}</Text>
              <Text style={{color:c||T.tp,fontSize:17,fontWeight:'700'}}>{v}</Text>
            </View>
          ))}
        </View>
      </View>

      <Chip label="Bugün" color={T.acc}/>
      <View style={{marginTop:10,marginBottom:22}}>
        {todayShifts.length===0?(
          <View style={{backgroundColor:T.s1,borderRadius:16,padding:18,borderWidth:1,borderColor:T.b}}>
            <Text style={{color:T.tt,fontSize:15,fontWeight:'600'}}>Bugün izin günün</Text>
          </View>
        ):todayShifts.map(sh=>{
          const{c,l}=shiftColor(parseInt(sh.start.split(':')[0]));
          const colleagues=(sh.staffIds||[]).filter(id=>id!==1);
          return(
            <View key={sh.id} style={{backgroundColor:c+'12',borderWidth:1,borderColor:c+'30',borderRadius:18,padding:18,marginBottom:10}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:12}}>
                <View style={{backgroundColor:c+'25',borderRadius:9,paddingVertical:4,paddingHorizontal:10}}>
                  <Text style={{color:c,fontSize:11,fontWeight:'700',letterSpacing:0.5}}>{l}</Text>
                </View>
                <Text style={{color:T.tp,fontWeight:'700',fontSize:18}}>{sh.start} — {sh.end}</Text>
              </View>
              <Text style={{color:T.ts,fontSize:11,letterSpacing:0.5,textTransform:'uppercase',marginBottom:8}}>Ekip</Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                {colleagues.length===0?<Text style={{color:T.tt,fontSize:12}}>Tek başınasın</Text>:
                  colleagues.map(id=>{const s=gs(id);return(
                    <View key={id} style={{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:T.bg,borderRadius:10,paddingVertical:4,paddingHorizontal:8,borderWidth:1,borderColor:T.b}}>
                      <Av s={s} size={20}/>
                      <Text style={{color:'#aaa898',fontSize:11}}>{s.name.split(' ')[0]}</Text>
                    </View>
                  );})}
              </View>
            </View>
          );
        })}
      </View>

      <Chip label="Bu Hafta" color={T.acc}/>
      <View style={{marginTop:10}}>
        {DAYS_F.map((d,i)=>{
          const shifts=(sched[i]||[]).filter(s=>Array.isArray(s.staffIds)&&s.staffIds.includes(1));
          const isToday=i===TODAY;
          return(
            <View key={i} style={{flexDirection:'row',alignItems:'center',
              backgroundColor:isToday?T.s2:'transparent',borderRadius:14,
              padding:10,marginBottom:4,borderWidth:1,borderColor:isToday?T.b:'transparent'}}>
              <View style={{width:34,height:34,borderRadius:11,backgroundColor:T.s2,
                borderWidth:1,borderColor:isToday?T.acc+'60':T.b,
                alignItems:'center',justifyContent:'center',marginRight:12}}>
                <Text style={{color:isToday?T.acc:T.ts,fontSize:13,fontWeight:'700'}}>{i+11}</Text>
              </View>
              <View style={{flex:1}}>
                <Text style={{color:isToday?T.tp:'#3a3a34',fontSize:14,fontWeight:isToday?'600':'400'}}>{d}</Text>
              </View>
              {shifts.length>0?(
                <View style={{alignItems:'flex-end',gap:3}}>
                  {shifts.map(sh=>{const{c}=shiftColor(parseInt(sh.start.split(':')[0]));return(
                    <Text key={sh.id} style={{color:c,fontSize:11,fontWeight:'600'}}>{sh.start}–{sh.end}</Text>
                  );})}
                </View>
              ):<Text style={{color:T.tt,fontSize:12}}>İzin</Text>}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

/* ─── AVAIL VIEW ─────────────────────────────────────────── */
function AvailView({avail,setDayAvail}){
  const availCnt=Object.values(avail).filter(v=>v===null).length;
  return(
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
        <AvailDayRow key={i} day={d} dayNum={i+11} data={avail[i]} isToday={i===TODAY}
          onChange={val=>setDayAvail(i,val)}/>
      ))}
    </ScrollView>
  );
}

/* ─── AVAIL DAY ROW ──────────────────────────────────────── */
function AvailDayRow({day,dayNum,data,isToday,onChange}){
  const REASONS=['İzin','Hasta','Kişisel','Aile','Diğer'];
  const isAvail=data===null, isAllDay=data?.type==='allday', isPartial=data?.type==='partial';

  return(
    <View style={{marginBottom:10}}>
      <View style={{flexDirection:'row',alignItems:'center',backgroundColor:T.s1,
        borderRadius:isAvail?16:16,borderBottomLeftRadius:isAvail?16:0,borderBottomRightRadius:isAvail?16:0,
        padding:13,
        borderWidth:1,borderColor:isAvail?T.b:isAllDay?T.er+'30':T.acc+'30',
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
            {k:'av',l:'Müsait',  c:T.ok, active:isAvail,  act:()=>onChange(null)},
            {k:'all',l:'Tüm Gün',c:T.er, active:isAllDay, act:()=>onChange({type:'allday',reason:'İzin',note:''})},
            {k:'par',l:'Saat',   c:T.acc,active:isPartial,act:()=>onChange({type:'partial',blocks:[]})},
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

      {isAllDay&&(
        <View style={{backgroundColor:T.s2,borderWidth:1,borderColor:T.er+'22',borderTopWidth:0,
          borderBottomLeftRadius:16,borderBottomRightRadius:16,padding:14}}>
          <Text style={{color:T.ts,fontSize:9,letterSpacing:1.2,textTransform:'uppercase',fontWeight:'600',marginBottom:10}}>Mazeret</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:14}}>
            {REASONS.map(r=>{const sel=data.reason===r;return(
              <TouchableOpacity key={r} onPress={()=>onChange({...data,reason:r})}
                style={{backgroundColor:sel?T.er+'18':T.s3,borderWidth:1,borderColor:sel?T.er+'55':T.b,
                  borderRadius:9,paddingVertical:6,paddingHorizontal:13}}>
                <Text style={{color:sel?T.er:T.ts,fontSize:12.5,fontWeight:sel?'700':'400'}}>{r}</Text>
              </TouchableOpacity>
            );})}
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

      {isPartial&&(
        <View style={{backgroundColor:T.s2,borderWidth:1,borderColor:T.acc+'22',borderTopWidth:0,
          borderBottomLeftRadius:16,borderBottomRightRadius:16,padding:14}}>
          <Text style={{color:T.ts,fontSize:9,letterSpacing:1.2,textTransform:'uppercase',fontWeight:'600',marginBottom:12}}>Müsait olmadığım saatler</Text>
          {(data.blocks||[]).map(bl=>(
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
          {(data.blocks||[]).length===0&&(
            <Text style={{color:T.tt,fontSize:13,marginBottom:10}}>Henüz saat aralığı eklenmedi</Text>
          )}
          <AddBlockForm onAdd={bl=>onChange({...data,blocks:[...(data.blocks||[]),{...bl,id:mkId()}]})}/>
        </View>
      )}
    </View>
  );
}

/* ─── ADD BLOCK FORM ─────────────────────────────────────── */
function AddBlockForm({onAdd}){
  const[open,setOpen]=useState(false);
  const[start,setStart]=useState('09:00');
  const[end,setEnd]=useState('13:00');
  const[reason,setR]=useState('İzin');
  const[note,setNote]=useState('');
  const REASONS=['İzin','Hasta','Kişisel','Aile','Diğer'];

  if(!open) return(
    <TouchableOpacity onPress={()=>setOpen(true)}
      style={{backgroundColor:'transparent',borderWidth:1,borderColor:T.acc+'45',
        borderStyle:'dashed',borderRadius:12,padding:10,alignItems:'center'}}>
      <Text style={{color:T.acc,fontSize:12,fontWeight:'700',letterSpacing:0.5}}>+ Saat Aralığı Ekle</Text>
    </TouchableOpacity>
  );

  return(
    <View style={{backgroundColor:T.s3,borderWidth:1,borderColor:T.acc+'25',borderRadius:13,padding:14}}>
      <View style={{flexDirection:'row',gap:10,marginBottom:12}}>
        <TimeInput value={start} onChange={setStart} label="Başlangıç"/>
        <TimeInput value={end} onChange={setEnd} label="Bitiş"/>
      </View>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:5,marginBottom:10}}>
        {REASONS.map(r=>{const sel=reason===r;return(
          <TouchableOpacity key={r} onPress={()=>setR(r)}
            style={{backgroundColor:sel?T.accM:T.s2,borderWidth:1,borderColor:sel?T.acc+'55':T.b,
              borderRadius:8,paddingVertical:5,paddingHorizontal:11}}>
            <Text style={{color:sel?T.acc:T.ts,fontSize:11.5,fontWeight:sel?'700':'400'}}>{r}</Text>
          </TouchableOpacity>
        );})}
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

/* ─── TEAM VIEW ──────────────────────────────────────────── */
function TeamView(){
  return(
    <ScrollView style={{flex:1}} contentContainerStyle={{padding:20}}>
      <Chip label="5 aktif" color={T.ok}/>
      <Text style={{color:T.tp,fontSize:22,fontWeight:'700',marginTop:8,marginBottom:20}}>Ekip</Text>
      {STAFF.map(s=>(
        <View key={s.id} style={{flexDirection:'row',alignItems:'center',gap:14,
          backgroundColor:T.s1,borderRadius:18,padding:15,marginBottom:10,borderWidth:1,borderColor:T.b}}>
          <View style={{width:46,height:46,borderRadius:14,backgroundColor:s.c+'20',
            borderWidth:1,borderColor:s.c+'35',alignItems:'center',justifyContent:'center'}}>
            <Text style={{fontSize:13,color:s.c,fontWeight:'800'}}>{s.i}</Text>
          </View>
          <View style={{flex:1}}>
            <Text style={{color:T.tp,fontWeight:'600',fontSize:15}}>{s.name}</Text>
            <Text style={{color:T.ts,fontSize:12,marginTop:2}}>{s.role}</Text>
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
function Nav({role,tab,setTab,onLogout}){
  const tabs=role==='admin'?[{k:'home',l:'Vardiyalar'},{k:'team',l:'Ekip'}]:[{k:'home',l:'Vardiyam'},{k:'avail',l:'Müsaitlik'}];
  return(
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
function Av({s,size=24}){
  return(
    <View style={{width:size,height:size,borderRadius:Math.round(size*.32),
      backgroundColor:s.c+'25',alignItems:'center',justifyContent:'center'}}>
      <Text style={{fontSize:size*.38,color:s.c,fontWeight:'800'}}>{s.i}</Text>
    </View>
  );
}
function Chip({label,color}){
  return(
    <View style={{flexDirection:'row',alignItems:'center',gap:6,
      backgroundColor:color+'15',borderWidth:1,borderColor:color+'30',
      borderRadius:8,paddingVertical:4,paddingHorizontal:10,alignSelf:'flex-start'}}>
      <View style={{width:5,height:5,borderRadius:3,backgroundColor:color}}/>
      <Text style={{color:color,fontSize:11,fontWeight:'700',letterSpacing:0.5}}>{label.toUpperCase()}</Text>
    </View>
  );
}
