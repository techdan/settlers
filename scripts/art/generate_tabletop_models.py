"""Original miniature art for Settlers of Lanc; no downloaded geometry or textures.

Run from the repository with Blender 5.2 (or newer):
  blender -b --python scripts/art/generate_tabletop_models.py
Add -- --preview to also render the asset contact sheet.

Coordinates used by the authoring helpers are Three.js coordinates: X right,
Y up, Z toward the viewer. Export converts Blender Z-up to glTF Y-up. Each
material is one merged mesh, so hundreds of small details need few draw calls.
Palette colors are read from themes/tabletop/palette.ts on every generation.
"""

import bpy
import json
import math
import random
import re
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'models' / 'tabletop'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = (ROOT / 'themes' / 'tabletop' / 'palette.ts').read_text()


def palette(section):
    block = re.search(r'\b' + section + r':\s*\{([^}]+)', SOURCE).group(1)
    return dict(re.findall(r"(\w+):\s*'(#\w+)'", block))


P = {key: palette(key) for key in ['forest', 'hill', 'pasture', 'field',
     'mountain', 'desert', 'token', 'port', 'robber', 'merchant', 'barbarian']}
CREAM = '#e8dcc0'
GOLD = '#c9973f'
INK = '#514733'
TIMBER = P['port']['pier']
OWNER = '#c87947'


def rgb(hex_color):
    channels = [int(hex_color[i:i+2], 16) / 255 for i in (1, 3, 5)]
    return tuple(c / 12.92 if c < .04045 else ((c + .055) / 1.055)**2.4 for c in channels)


def shade(hex_color, factor):
    return '#' + ''.join(f'{min(255, round(int(hex_color[i:i+2], 16)*factor)):02x}' for i in (1, 3, 5))


def vec(p):
    return p[0], -p[2], p[1]


MATERIALS = {}


def material(color, owner=False):
    key = ('owner-' if owner else '') + color
    if key not in MATERIALS:
        mat = bpy.data.materials.new('owner-paint' if owner else 'paint-' + color[1:])
        mat.diffuse_color = (*rgb(color), 1)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get('Principled BSDF')
        bsdf.inputs['Base Color'].default_value = (*rgb(color), 1)
        bsdf.inputs['Roughness'].default_value = .72 if owner else .9
        if color == GOLD:
            bsdf.inputs['Metallic'].default_value = .45
            bsdf.inputs['Roughness'].default_value = .42
        MATERIALS[key] = mat
    return MATERIALS[key]


class Model:
    def __init__(self, name):
        self.name = name
        self.parts = {}

    def mesh(self, vertices, faces, color, smooth=False, owner=False):
        key = (color, owner)
        vert, face, smoothing = self.parts.setdefault(key, ([], [], []))
        offset = len(vert)
        vert.extend(vec(v) for v in vertices)
        face.extend(tuple(index + offset for index in f) for f in faces)
        smoothing.extend([smooth] * len(faces))

    def box(self, pos, size, color, yaw=0, owner=False):
        x, y, z = pos
        w, h, d = [v / 2 for v in size]
        points = []
        for xx, yy, zz in [(-w,-h,-d),(w,-h,-d),(w,-h,d),(-w,-h,d),
                           (-w,h,-d),(w,h,-d),(w,h,d),(-w,h,d)]:
            points.append((x+xx*math.cos(yaw)+zz*math.sin(yaw), y+yy,
                           z-xx*math.sin(yaw)+zz*math.cos(yaw)))
        self.mesh(points, [(1,2,3,0),(7,6,5,4),(4,5,1,0),(5,6,2,1),
                           (6,7,3,2),(7,4,0,3)], color, owner=owner)

    def cylinder(self, pos, bottom, top, height, color, sides=10, yaw=0,
                 smooth=False, owner=False):
        x, y, z = pos
        vertices = []
        for radius, yy in [(bottom, y-height/2), (top, y+height/2)]:
            vertices.extend((x+radius*math.cos(2*math.pi*i/sides+yaw), yy,
                             z+radius*math.sin(2*math.pi*i/sides+yaw)) for i in range(sides))
        faces = [tuple(reversed(range(sides))), tuple(range(sides, sides*2))]
        faces.extend((i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides))
        # In X/Y-up/Z coordinates the angular ring faces downward.
        self.mesh(vertices, [tuple(reversed(f)) for f in faces], color, smooth, owner)

    def sphere(self, pos, scale, color, sides=10, rings=6, smooth=True, owner=False):
        vertices = []
        for j in range(rings+1):
            theta = math.pi*j/rings
            for i in range(sides):
                angle = 2*math.pi*i/sides
                vertices.append((pos[0]+scale[0]*math.sin(theta)*math.cos(angle),
                                 pos[1]+scale[1]*math.cos(theta),
                                 pos[2]+scale[2]*math.sin(theta)*math.sin(angle)))
        faces = [(j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i)
                 for j in range(rings) for i in range(sides)]
        self.mesh(vertices, faces, color, smooth, owner)

    def beam(self, start, end, radius, color, sides=6, owner=False):
        a, b = Vector(start), Vector(end)
        direction = (b-a).normalized()
        u = direction.cross(Vector((0,1,0)))
        if u.length < .001:
            u = direction.cross(Vector((1,0,0)))
        u.normalize()
        v = direction.cross(u).normalized()
        vertices = [tuple(p+radius*(u*math.cos(2*math.pi*i/sides)+v*math.sin(2*math.pi*i/sides)))
                    for p in (a,b) for i in range(sides)]
        faces = [tuple(reversed(range(sides))),tuple(range(sides,sides*2))]
        faces.extend((i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides))
        self.mesh(vertices, faces, color, owner=owner)

    def roof(self, x, y, z, w, h, d, color, owner=False):
        self.mesh([(x-w/2,y,z-d/2),(x+w/2,y,z-d/2),(x,y+h,z-d/2),
                   (x-w/2,y,z+d/2),(x+w/2,y,z+d/2),(x,y+h,z+d/2)],
                  [(0,2,1),(3,4,5),(0,3,5,2),(1,2,5,4),(0,1,4,3)], color, owner=owner)

    def export(self):
        objects = []
        for (color, owner), (vertices, faces, smoothing) in self.parts.items():
            mesh = bpy.data.meshes.new(self.name)
            mesh.from_pydata(vertices, [], faces)
            mesh.update()
            for polygon, smooth in zip(mesh.polygons, smoothing):
                polygon.use_smooth = smooth
            obj = bpy.data.objects.new(self.name, mesh)
            bpy.context.collection.objects.link(obj)
            obj.data.materials.append(material(color, owner))
            objects.append(obj)
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.export_scene.gltf(filepath=str(OUT / (self.name + '.glb')),
                                  export_format='GLB', use_selection=True,
                                  export_yup=True, export_materials='EXPORT',
                                  export_cameras=False, export_lights=False)
        stats = {'name': self.name, 'meshes': len(objects),
                 'vertices': sum(len(v) for v, _, _ in self.parts.values()),
                 'bytes': (OUT / (self.name + '.glb')).stat().st_size}
        for obj in objects:
            bpy.data.objects.remove(obj, do_unlink=True)
        return stats


def tree(m, x, z, height, rng, deciduous=False):
    p = P['forest']
    m.cylinder((x,height*.2,z),.025,.02,height*.4,p['trunk'],7)
    if deciduous:
        for dx, dy, dz, radius in [(-.05,.64,0,.13),(.06,.68,.03,.13),(0,.84,-.03,.11)]:
            m.sphere((x+dx,height*dy,z+dz),(radius,height*.25,radius),
                     rng.choice([p['canopy'],p['canopyLight'],p['under']]), sides=8,rings=5,smooth=False)
    else:
        for fraction, radius, depth in [(.4,.18,.4),(.6,.145,.4),(.81,.10,.36)]:
            m.cylinder((x,height*fraction,z),radius*height/.55,.01,height*depth,
                       rng.choice([p['canopy'],p['canopyLight'],p['canopyDark']]),8,yaw=rng.random())


def sheep(m, x, z, angle=0, size=1):
    def pt(dx,dy,dz):
        return x+size*(dx*math.cos(angle)+dz*math.sin(angle)),dy*size,z+size*(-dx*math.sin(angle)+dz*math.cos(angle))
    p=P['pasture']
    for dx in [-.055,.055]:
        for dz in [-.035,.035]:
            m.beam(pt(dx,.015,dz),pt(dx,.1,dz),.013*size,p['face'])
    m.sphere(pt(0,.115,0),(.095*size,.064*size,.062*size),p['wool'],8,5)
    for dx,dy,dz in [(-.045,.148,0),(.01,.166,0),(.055,.145,0),(0,.125,-.05),(0,.125,.05)]:
        m.sphere(pt(dx,dy,dz),(.041*size,.035*size,.032*size),p['wool'],8,4)
    m.sphere(pt(.099,.111,.012),(.035*size,.041*size,.03*size),p['face'],8,5)
    for dz in [-.034,.044]:
        m.sphere(pt(.094,.133,dz),(.027*size,.012*size,.016*size),p['face'],6,4)


def rocks(m, rng, color, n=14):
    for _ in range(n):
        x,z = rng.uniform(-.62,.62),rng.uniform(-.59,.3)
        if math.hypot(x,z)>.7 or math.hypot(x,z-.27)<.34:
            continue
        r=rng.uniform(.018,.05)
        m.sphere((x,r*.48,z),(r,r*.7,r*.9),shade(color,rng.choice([.95,1.03,1.1])),6,4,False)


def terrain(kind, variant):
    m=Model(f'terrain-{kind}-{variant}')
    rng=random.Random(kind+str(variant))
    p=P[kind]
    if kind=='forest':
        for x,z,s in [(-.32,-.29,.58),(.05,-.42,.7),(.34,-.24,.54),(-.49,.08,.42),(.46,.11,.38),(0,-.2,.43)]:
            tree(m,x+rng.uniform(-.04,.04),z+rng.uniform(-.03,.03),s,rng, rng.random()<.25)
        for x,z in [(-.37,-.3),(.17,-.4),(.4,-.1),(-.4,.18)]:
            m.sphere((x,.009,z),(.17,.025,.15),p['under'],12,4)
        for x,z in [(-.38,.37),(.43,.35)]:
            m.beam((x-.07,.032,z),(x+.07,.032,z+.055),.028,p['trunk'],8)
            m.sphere((x+.07,.033,z+.055),(.029,.029,.014),CREAM,8,4)
        rocks(m,rng,p['canopyDark'],6)
    elif kind=='pasture':
        for x,z,r in [(-.25,-.25,.33),(.3,-.21,.29),(-.46,.2,.18)]:
            m.sphere((x,-.025,z),(r,.079,r*.84),p['patchLight'],14,6)
        for x,z,a in [(-.3,-.2,-.35),(.15,-.35,1.1),(.42,-.03,2.3),(-.46,.17,.3)]:
            sheep(m,x,z,a+rng.uniform(-.25,.25),rng.uniform(.82,1.05))
        for x in [-.36,-.16,.04,.24]:
            m.box((x,.086,-.57),(.025,.172,.025),TIMBER)
        for y in [.07,.14]:
            m.beam((-.36,y,-.57),(.24,y,-.57),.012,TIMBER,6)
        for _ in range(28):
            x,z=rng.uniform(-.62,.62),rng.uniform(-.55,.5)
            if math.hypot(x,z)>.65 or math.hypot(x,z-.27)<.33:
                continue
            m.cylinder((x,.025,z),.007,.003,.05,p['patchDark'],5)
            m.sphere((x,.05,z),(.012,.008,.012),rng.choice([CREAM,'#ead171']),6,3)
    elif kind=='field':
        for row in range(6):
            x=-.48+row*.186
            end=-.05 if abs(x)<.32 else .31
            start=-.5+abs(x)*.17
            m.box((x,.009,(start+end)/2),(.104,.019,end-start+.08),p['furrowDark'],yaw=-.075)
            n=round((end-start)/.075)
            for j in range(n+1):
                z=start+j*.074
                for offset in [-.026, .023]:
                    xx=x+offset+rng.uniform(-.006,.006)
                    h=rng.uniform(.115,.19)
                    m.beam((xx,.02,z),(xx+.012,h,z),.005,p['stalk'],4)
                    m.sphere((xx+.013,h,z),(.018,.035,.012),p['furrowLight'],5,4,False)
                    m.beam((xx+.012,h,z),(xx+.015,h+.05,z),.0025,p['furrowLight'],3)
        # Tied sheaves make the harvest legible even from the overview camera.
        for x,z in [(-.43,.43),(.43,.42)]:
            m.cylinder((x,.085,z),.062,.048,.16,p['furrowLight'],10)
            m.cylinder((x,.087,z),.064,.061,.026,TIMBER,10)
            for i in range(6):
                a=math.pi*i/3
                m.beam((x,.09,z),(x+.067*math.cos(a),.21,z+.045*math.sin(a)),.008,p['furrowLight'],4)
    elif kind=='hill':
        for x,z,r,h in [(-.26,-.23,.3,.36),(.17,-.38,.31,.44),(.42,-.08,.18,.21)]:
            sides=7
            shape=[rng.uniform(.85,1.08) for _ in range(sides)]
            for layer in range(4):
                bottom=r*(1-layer*.12)
                top=r*(1-(layer+1)*.12)
                vertices=[]
                for rad, yy in [(bottom,h*layer/4),(top,h*(layer+1)/4)]:
                    vertices.extend((x+rad*math.cos(i*2*math.pi/sides)*shape[i],yy,
                                     z+rad*math.sin(i*2*math.pi/sides)*shape[i]*.8) for i in range(sides))
                faces=[tuple(reversed(range(sides,sides*2)))]
                faces.extend(((i+1)%sides,i,i+sides,(i+1)%sides+sides) for i in range(sides))
                m.mesh(vertices,faces,[p['brickDark'],p['base'],p['ground'],shade(p['ground'],1.07)][layer])
        for i in range(7):
            m.box((-.43+(i%3)*.075,.025+(i//3)*.045,.26),(.068,.039,.07),p['brick'],yaw=.16)
        rocks(m,rng,p['ground'],12)
    elif kind=='mountain':
        for x,z,r,h in [(-.27,-.24,.32,.6),(.12,-.36,.34,.78),(.39,-.04,.24,.44)]:
            sides=7
            points=[(x+r*math.cos(i*math.pi*2/sides),.006,z+r*math.sin(i*math.pi*2/sides)*.8) for i in range(sides)]
            tip=(x-.045,h,z-.025)
            mid=[(a[0]*.29+tip[0]*.71,h*.71+rng.uniform(-.038,.015),a[2]*.29+tip[2]*.71) for a in points]
            for i in range(sides):
                j=(i+1)%sides
                color=[p['peak'],p['peakDark'],p['facetLight'],p['peakMid'],p['scree'],p['peak'],p['facetLight2']][i]
                m.mesh([points[i],points[j],mid[j],mid[i]],[(3,2,1,0)],color)
                m.mesh([mid[i],mid[j],tip],[(2,1,0)],p['snow'])
        rocks(m,rng,p['scree'],24)
        for x,z in [(-.43,.23),(.45,.29)]:
            m.cylinder((x,.071,z),.065,.035,.14,p['peakDark'],5,yaw=.3)
            m.cylinder((x+.042,.092,z-.023),.035,.008,.184,p['facetLight2'],5,yaw=.6)
    else:
        for x,z,rx,rz,h in [(-.25,-.32,.35,.21,.115),(.3,-.2,.31,.22,.09),(-.42,.14,.2,.18,.075)]:
            # Asymmetric curved dune cross sections with a sharp sunlit ridge.
            points=[]
            for i in range(11):
                t=i/10
                xx=x+(t-.5)*2*rx
                curve=math.sin(math.pi*t)
                for zz,hh in [(-rz,.004),(-rz*.12,h),(rz,.004)]:
                    points.append((xx,hh*curve,z+zz*curve))
            for i in range(10):
                k=i*3
                m.mesh(points,[(k+1,k+4,k+3,k)],p['sun'])
                m.mesh(points,[(k+2,k+5,k+4,k+1)],p['dune'])
        for x,z in [(.46,.23),(-.36,.4)]:
            m.beam((x,.015,z),(x-.017,.17,z-.02),.008,TIMBER,5)
            m.beam((x-.008,.08,z-.01),(x-.065,.11,z-.02),.007,TIMBER,5)
            m.beam((x-.014,.13,z-.02),(x+.033,.19,z-.045),.006,TIMBER,5)
        rocks(m,rng,p['dune'],10)
    return m


def foundation(kind):
    m=Model('foundation-'+kind)
    # Narrow bevels above and below a warm cardboard / sandstone edge.
    rings=[(.945,-.25),(.979,-.22),(.979,-.054),(.955,-.02),(.945,0)]
    colors=[shade(CREAM,.69),CREAM,shade(CREAM,1.03),P[kind]['base']]
    for i in range(len(rings)-1):
        r0,y0=rings[i]
        r1,y1=rings[i+1]
        m.cylinder((0,(y0+y1)/2,0),r0,r1,y1-y0,colors[i],6,yaw=-math.pi/6)
    # The last bevel already caps at y=0. Avoid a coplanar second cap, which
    # produces self-shadowing artifacts when glTF recomputes tangent frames.
    return m


def house(m,x,z,w,d,h,roof_h,kind='settlement'):
    m.box((x,h/2,z),(w,h,d),OWNER,owner=True)
    m.box((x,h*.38,z+d/2+.002),(w*.22,h*.62,.014),INK)
    m.box((x,h*.4,z+d/2+.012),(w*.045,h*.59,.012),TIMBER)
    for dx in [-w*.29,w*.29]:
        m.box((x+dx,h*.58,z+d/2+.009),(w*.15,h*.25,.017),CREAM)
        m.box((x+dx,h*.58,z+d/2+.02),(w*.023,h*.27,.01),TIMBER)
    m.box((x,h*.07,z+d/2+.018),(w*1.04,.025,.036),CREAM)
    m.roof(x,h,z,w*1.15,roof_h,d*1.13,shade(TIMBER,.87))
    for i in range(1,4):
        yy=h+roof_h*i/4
        ww=w*1.15*(1-i/4)
        for side in [-1,1]:
            m.beam((x+ww/2*side,yy,z-d*.58),(x+ww/2*side,yy,z+d*.58),.006,shade(TIMBER,1.21),4)


def building(kind):
    m=Model('building-'+kind)
    m.cylinder((0,.017,0),.218,.209,.034,shade(CREAM,.86),12)
    if kind=='settlement':
        house(m,0,0,.26,.23,.205,.13)
        m.box((.075,.28,-.055),(.038,.13,.037),CREAM)
    elif kind=='city':
        house(m,-.057,.045,.21,.2,.235,.14)
        house(m,.085,-.04,.12,.15,.415,.115)
        m.box((.085,.37,.039),(.035,.057,.012),CREAM)
    else:
        house(m,0,.046,.22,.19,.275,.15)
        for x,h in [(-.13,.46),(.13,.53)]:
            m.cylinder((x,h/2,-.055),.066,.063,h,OWNER,8,owner=True)
            m.cylinder((x,h+.07,-.055),.086,.005,.14,GOLD,8)
            m.box((x,h*.8,.008),(.025,.055,.014),CREAM)
        m.cylinder((0,.26,-.105),.064,.064,.52,OWNER,8,owner=True)
        m.cylinder((0,.577,-.105),.083,.007,.115,GOLD,8)
        m.beam((0,.63,-.105),(0,.747,-.105),.006,GOLD)
        m.mesh([(0,.744,-.105),(.092,.715,-.105),(0,.687,-.105)],[(0,1,2),(2,1,0)],CREAM)
    return m


def wall():
    m=Model('city-wall')
    for i in range(10):
        angle=i*2*math.pi/10
        x,z=.217*math.cos(angle),.217*math.sin(angle)
        m.box((x,.055,z),(.137,.085,.042),OWNER,yaw=math.pi/2-angle,owner=True)
        m.box((x,.108,z),(.054,.04,.047),CREAM,yaw=math.pi/2-angle)
    return m


def knight(level, active):
    m=Model(f'knight-{level}-{int(active)}')
    trim=GOLD if active else '#8e8a7d'
    m.cylinder((0,.018,0),.151,.141,.036,trim,12)
    m.cylinder((0,.041,0),.12,.11,.026,OWNER,12,owner=True)
    # A carved helmet, broad shoulders, and painted shield read at small scale.
    m.cylinder((0,.118,0),.074,.04,.15,OWNER,10,owner=True)
    m.sphere((0,.229,0),(.068,.083,.058),'#bdb9a8',10,6)
    m.box((0,.232,.054),(.091,.013,.014),INK)
    m.beam((-.057,.243,.047),(.057,.243,.047),.009,trim,6)
    m.sphere((0,.305,-.01),(.019,.055,.041),OWNER,8,5,owner=True)
    m.sphere((-.076,.156,0),(.037,.055,.038),OWNER,8,5,owner=True)
    m.sphere((.076,.156,0),(.037,.055,.038),OWNER,8,5,owner=True)
    m.beam((.104,.06,.012),(.104,.361,.012),.008,TIMBER,6)
    m.mesh([(.083,.357,.012),(.104,.404,.012),(.125,.357,.012),(.104,.357,.027)],
           [(0,1,3),(1,2,3),(2,0,3),(2,1,0)],trim)
    shield=[(-.104,.208,.076),(-.004,.208,.076),(-.008,.126,.086),(-.055,.094,.089),(-.1,.126,.086)]
    m.mesh(shield,[(0,1,2,3,4),(4,3,2,1,0)],OWNER,owner=True)
    for j in range(level):
        m.box((-.079+j*.024,.166,.087),(.012,.038,.009),trim)
    return m


def traveler(kind):
    m=Model('traveler-'+kind)
    p=P[kind]
    color=p['body']
    m.cylinder((0,.018,0),.139,.126,.036,p.get('base',p.get('bodyShade')),12)
    for x in [-.036,.036]:
        m.sphere((x,.049,.044),(.034,.034,.068),TIMBER,8,5)
    m.cylinder((0,.188,0),.104,.055,.292,color,12)
    # Folded cloak panels make a human silhouette rather than a playing pawn.
    for i in range(7):
        a=i*math.pi*2/7
        m.beam((.086*math.cos(a),.052,.086*math.sin(a)),
               (.044*math.cos(a),.291,.044*math.sin(a)),.012,
               p.get('bodyLight',p.get('bodyShade')),5)
    m.sphere((0,.363,-.002),(.073,.085,.071),color,10,7)
    m.sphere((0,.362,.049),(.044,.049,.026),INK if kind=='robber' else '#cfa46e',9,6)
    m.sphere((-.065,.258,.014),(.032,.077,.037),color,8,5)
    m.sphere((.068,.26,.02),(.032,.077,.039),color,8,5)
    if kind=='merchant':
        m.cylinder((0,.409,0),.113,.108,.024,p['hat'],12)
        m.cylinder((0,.448,0),.073,.055,.067,p['hat'],12)
        m.box((0,.411,0),(.123,.018,.114),GOLD)
        m.sphere((-.09,.179,-.039),(.047,.065,.055),TIMBER,8,6)
        m.beam((.109,.016,.015),(.109,.365,-.009),.01,TIMBER,7)
        m.beam((-.041,.31,-.048),(.08,.123,.041),.014,TIMBER,5)
    else:
        m.cylinder((0,.449,-.019),.057,.008,.091,color,9)
        m.sphere((.093,.16,.013),(.047,.059,.045),p['bodyLight'],9,6)
        m.box((0,.168,.082),(.144,.025,.03),TIMBER)
        m.box((0,.17,.101),(.027,.025,.009),GOLD)
    return m


def boat(m, x=0, y=0, z=0, scale=1, barbarian=False):
    def pt(xx,yy,zz):
        return x+xx*scale,y+yy*scale,z+zz*scale
    hull=P['barbarian']['hull']
    # Ten-sided canoe hull with a flat gunwale, tapered ends, and deep keel.
    outline=[(-.12,-.18),(-.13,.15),(-.07,.27),(0,.33),(.07,.27),(.13,.15),(.12,-.18),(.07,-.25),(0,-.29),(-.07,-.25)]
    vertices=[pt(xx,yy,zz) for yy,s in [(-.1,.68),(.06,1)] for xx,zz in [(a*s,b*s) for a,b in outline]]
    for i in range(10):
        j=(i+1)%10
        m.mesh(vertices,[(i,j,j+10,i+10)],shade(hull, .9 if i%2 else 1.08))
    m.mesh(vertices,[tuple(range(10,20)),tuple(reversed(range(10,20)))],P['port']['plank'])
    for i in range(10):
        a,b=outline[i],outline[(i+1)%10]
        m.beam(pt(a[0],.066,a[1]),pt(b[0],.066,b[1]),.014*scale,CREAM if not barbarian else hull,6)
    m.beam(pt(0,.05,-.025),pt(0,.71,-.025),.012*scale,TIMBER,8)
    m.beam(pt(-.218,.606,-.025),pt(.218,.606,-.025),.01*scale,TIMBER,7)
    # Curved cloth follows a bilinear grid, with a shallow billow toward +Z.
    for i in range(5):
        for j in range(6):
            verts=[]
            for ii,jj in [(i,j),(i+1,j),(i+1,j+1),(i,j+1)]:
                u,v=ii/5,jj/6
                xx=(u-.5)*(.36-.05*v)
                yy=.595-v*.35
                zz=-.025+.075*math.sin(math.pi*u)*math.sin(math.pi*v)
                verts.append(pt(xx,yy,zz))
            color=P['barbarian']['stripe'] if barbarian and i%2==0 else P['barbarian']['sail']
            m.mesh(verts,[(0,1,2,3),(3,2,1,0)],color,True)
    m.mesh([pt(0,.709,-.025),pt(.14,.674,-.025),pt(0,.65,-.025)],[(0,1,2),(2,1,0)],GOLD)
    for zz in [-.145,.13]:
        m.box(pt(0,.08,zz),(.225*scale,.028*scale,.034*scale),TIMBER)
    if barbarian:
        for side in [-1,1]:
            for zz in [-.13,0,.13]:
                m.sphere(pt(side*.133,.053,zz),(.019*scale,.046*scale,.047*scale),GOLD if zz==0 else P['barbarian']['stripe'],10,6)
                m.beam(pt(side*.1,.06,zz),pt(side*.3,-.03,zz+.16),.009*scale,TIMBER,6)


def harbor(kind):
    m=Model('harbor-'+kind)
    # Main pier: deck y=-.08, pilings terminate below the sea at y=-.34.
    for i in range(11):
        m.box((-.08,-.078,-.34+i*.069),(.36,.034,.062),shade(P['port']['plank'],1+(i%3)*.055))
    for x in [-.25,.09]:
        m.box((x,-.126,.005),(.041,.05,.78),TIMBER)
        for z in [-.31,.0,.34]:
            m.cylinder((x,-.2,z),.032,.026,.32,TIMBER,9)
            m.cylinder((x,-.034,z),.031,.031,.012,CREAM,9)
            m.cylinder((x,-.079,z),.034,.034,.025,shade(TIMBER,.7),9)
    for i in range(5):
        m.box((-.08,-.078,.35+i*.044),(.55,.034,.038),P['port']['plank'])
    # Bollards and mooring rope lead to the small original sailboat.
    for x in [-.33,.17]:
        m.cylinder((x,-.025,.48),.022,.026,.064,TIMBER,8)
    boat(m,.30,-.19,.23,.6)
    m.beam((.17,-.006,.48),(.3,-.145,.405),.006,CREAM,6)
    m.beam((.09,-.04,0),(.3,-.145,.07),.006,CREAM,6)
    # Resource-specific cargo has an immediately recognizable silhouette.
    if kind=='wood':
        for i in range(5):
            x=-.16+(i%2)*.087
            y=-.018+(i//2)*.057
            m.beam((x,y,-.21),(x,y,.025),.031,TIMBER,8)
            m.sphere((x,y,.029),(.029,.029,.006),CREAM,8,4)
    elif kind=='brick':
        for i in range(8):
            m.box((-.18+(i%2)*.09,-.029+(i//4)*.048,-.22+(i//2%2)*.082),(.082,.042,.076),P['hill']['brick'])
    elif kind=='ore':
        for i in range(6):
            m.sphere((-.17+(i%2)*.09,-.012+(i//4)*.056,-.21+(i//2%2)*.075),(.054,.056,.043),P['mountain']['peak'],7,4,False)
    elif kind=='sheep':
        for x,z in [(-.13,-.21),(-.06,-.075)]:
            m.sphere((x,-.003,z),(.081,.07,.062),P['pasture']['wool'],10,6)
            m.beam((x-.07,0,z),(x+.07,0,z),.008,TIMBER,5)
    elif kind=='wheat':
        for x,z in [(-.14,-.22),(-.065,-.08)]:
            m.cylinder((x,.004,z),.047,.053,.15,P['field']['furrowLight'],9)
            m.cylinder((x,.014,z),.055,.054,.02,TIMBER,9)
    else:
        for x,z,y in [(-.17,-.2,-.002),(-.045,-.18,-.014),(-.145,-.04,-.014)]:
            m.box((x,y,z),(.102,.13,.106),P['port']['plank'])
            m.box((x,y,z+.056),(.015,.14,.008),TIMBER)
            m.box((x,y+.03,z+.057),(.105,.013,.009),TIMBER)
    m.beam((-.25,-.065,-.31),(-.25,.375,-.31),.011,TIMBER,7)
    pennant={'wood':P['forest']['canopy'],'brick':P['hill']['brick'],
             'ore':P['mountain']['peak'],'sheep':P['pasture']['patchLight'],
             'wheat':P['field']['base'],'generic':GOLD}[kind]
    m.mesh([(-.25,.37,-.31),(-.04,.33,-.31),(-.25,.26,-.31)],[(0,1,2),(2,1,0)],pennant)
    return m


def preview():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    kinds=['forest','pasture','field','hill','mountain','desert']
    for i,kind in enumerate(kinds):
        x=(i%3-1)*2.08
        z=(i//3-.5)*2.08-.45
        for file in ['foundation-'+kind,'terrain-'+kind+'-0']:
            bpy.ops.import_scene.gltf(filepath=str(OUT/(file+'.glb')))
            for obj in bpy.context.selected_objects:
                obj.location+=Vector(vec((x,0,z)))
    for i,name in enumerate(['building-settlement','building-city','building-metropolis','traveler-robber','traveler-merchant','knight-3-1']):
        bpy.ops.import_scene.gltf(filepath=str(OUT/(name+'.glb')))
        for obj in bpy.context.selected_objects:
            obj.location+=Vector(vec((-2.3+i*.88,0,2.5)))
    for i,kind in enumerate(['wood','wheat','generic']):
        bpy.ops.import_scene.gltf(filepath=str(OUT/('harbor-'+kind+'.glb')))
        for obj in bpy.context.selected_objects:
            obj.location+=Vector(vec((-2.05+i*2.05,0,3.7)))
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.29))
    bpy.context.object.data.materials.append(material('#2f6472'))
    world=bpy.context.scene.world
    world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.6,.68,.72,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.4
    bpy.ops.object.light_add(type='AREA',location=(-3,-4,8))
    bpy.context.object.data.energy=1600
    bpy.context.object.data.shape='DISK'
    bpy.context.object.data.size=5
    bpy.ops.object.camera_add(location=(5,-9,10))
    camera=bpy.context.object
    direction=Vector((0,-.8,0))-camera.location
    camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO'
    camera.data.ortho_scale=9.3
    scene=bpy.context.scene
    scene.camera=camera
    scene.render.engine='CYCLES'
    scene.cycles.samples=16
    scene.cycles.use_denoising=True
    scene.render.resolution_x=1300
    scene.render.resolution_y=1300
    scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX'
    scene.render.image_settings.file_format='PNG'
    scene.render.filepath=str(OUT/'art-contact-sheet.png')
    source_dir=ROOT/'assets'/'3d'
    source_dir.mkdir(parents=True,exist_ok=True)
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(source_dir/'tabletop-art-review.blend'))
    bpy.ops.render.render(write_still=True)


def main():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    models=[]
    for kind in ['forest','hill','pasture','field','mountain','desert']:
        models.append(foundation(kind))
        models.extend(terrain(kind,v) for v in range(2))
    models.extend(building(kind) for kind in ['settlement','city','metropolis'])
    models.append(wall())
    models.extend(knight(level,active) for level in [1,2,3] for active in [False,True])
    models.extend(traveler(kind) for kind in ['robber','merchant'])
    models.extend(harbor(kind) for kind in ['generic','wood','brick','sheep','wheat','ore'])
    ship=Model('barbarian-boat')
    boat(ship,scale=1,barbarian=True)
    models.append(ship)
    stats=[model.export() for model in models]
    (OUT/'manifest.json').write_text(json.dumps({
        'author':'Original procedural geometry authored for Settlers of Lanc',
        'source':'scripts/art/generate_tabletop_models.py',
        'palette':'themes/tabletop/palette.ts',
        'generator':bpy.app.version_string,
        'coordinates':'glTF Y-up; ground y=0; terrain token clearance centered at x=0,z=0.27',
        'assets':stats},indent=2)+'\n')
    print('EXPORTED',len(stats),'MODELS;',sum(s['bytes'] for s in stats),'BYTES')
    if '--preview' in sys.argv:
        preview()


main()
