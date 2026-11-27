extends Node3D

const BOBBY = preload("res://assets/bobby.glb")
const LINE_FILE = "res://content/dialogue/rina_first_line.txt"
const WALK_SPEED := 3.35
const TRAIL_GAP := 1.12
const SWING_LENGTH := 0.66
const TARGET_LAYER := 4

var player: CharacterBody3D
var body: Node3D
var model: Node3D
var pivot: Node3D
var spring: SpringArm3D
var camera: Camera3D
var rina: Node3D
var target: Node3D
var weapon: Node3D
var right_arm: Node3D
var left_arm: Node3D
var legs: Array[Node3D] = []
var swing: AnimationPlayer
var impact: AudioStreamPlayer
var whoosh: AudioStreamPlayer
var chirp: AudioStreamPlayer
var trail: Array[Vector3] = []
var bridge: JavaScriptObject
var bridge_callback: JavaScriptObject
var original_line := ""
var preview_line := ""
var ready_to_play := false
var dialogue := false
var said_hello := false
var hits := 0
var swings := 0
var locked_hit := false
var active_swing := false
var strike_freeze := 0.0
var target_flash := 0.0
var clock := 0.0
var stride := 0.0
var shake := 0.0
var drag := false
var telemetry_clock := 0.0

func _ready() -> void:
	original_line = FileAccess.get_file_as_string(LINE_FILE).strip_edges()
	if original_line.is_empty():
		push_error("Missing Rina dialogue: " + LINE_FILE)
		original_line = "Ready when you are."
	preview_line = original_line
	_bind_actions()
	_build_world()
	_build_player()
	_build_rina()
	_build_target()
	impact = _audio(134.0, 43.0, 0.20, true)
	whoosh = _audio(330.0, 123.0, 0.13, false)
	chirp = _audio(830.0, 1760.0, 0.12, false)
	_restart()
	if OS.has_feature("web"):
		bridge = JavaScriptBridge.get_interface("bobbyPlaytest")
		if bridge:
			bridge_callback = JavaScriptBridge.create_callback(_web_action)
			bridge.connectGame(bridge_callback, original_line)
	else:
		ready_to_play = true
		print("Bobby clearing loaded. Dialogue: ", original_line)

func _bind_actions() -> void:
	for entry in [
		["forward", KEY_W], ["back", KEY_S], ["left", KEY_A], ["right", KEY_D],
		["orbit_left", KEY_Q], ["orbit_right", KEY_E], ["recenter", KEY_F],
		["talk", KEY_R], ["attack", KEY_SPACE]]:
		InputMap.add_action(entry[0])
		var key := InputEventKey.new()
		key.physical_keycode = entry[1]
		InputMap.action_add_event(entry[0], key)

func _material(color: Color) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.roughness = 1.0
	return material

func _mesh(shape: Mesh, material: Material, parent: Node3D, at: Vector3) -> MeshInstance3D:
	var item := MeshInstance3D.new()
	item.mesh = shape
	item.material_override = material
	parent.add_child(item)
	item.position = at
	return item

func _box(at: Vector3, size: Vector3, material: Material, solid := false) -> MeshInstance3D:
	var shape := BoxMesh.new()
	shape.size = size
	var item := _mesh(shape, material, self, at)
	if solid:
		var wall := StaticBody3D.new()
		add_child(wall)
		wall.position = at
		var collider := BoxShape3D.new()
		collider.size = size
		_shape(wall, collider)
	return item

func _shape(parent: CollisionObject3D, shape: Shape3D) -> void:
	var collision := CollisionShape3D.new()
	collision.shape = shape
	parent.add_child(collision)

func _build_world() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("#a7c9d2")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("#dce7e3")
	env.ambient_light_energy = 0.43
	env.fog_enabled = true
	env.fog_light_color = Color("#a7c9d2")
	env.fog_density = 0.021
	var backdrop := WorldEnvironment.new()
	backdrop.environment = env
	add_child(backdrop)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-49,-28,0)
	sun.light_color = Color("#ffe5aa")
	sun.light_energy = 0.67
	sun.shadow_enabled = true
	add_child(sun)
	var grass := _material(Color("#7b9159"))
	var sand := _material(Color("#bda478"))
	var basalt := _material(Color("#59695e"))
	var stones := _material(Color("#778071"))
	var ocean := _material(Color("#609aa8"))
	_box(Vector3(0,-0.30,0), Vector3(26,0.60,24), grass, true)
	_box(Vector3(0,-0.03,2.95),Vector3(3.35,0.075,9),sand)
	_box(Vector3(2.45,-0.024,0.35),Vector3(5,0.08,2.95),sand)
	_box(Vector3(4.5,-0.024,-3.18),Vector3(4,0.075,6.4),sand)
	_box(Vector3(0,-0.8,0),Vector3(140,0.15,140),ocean)
	# One real inside corner. These colliders also drive the spring-arm sweep.
	_box(Vector3(-2.3,1.16,2.5),Vector3(1.25,2.32,7),basalt,true)
	_box(Vector3(-0.1,1.06,-1.56),Vector3(5.60,2.12,1.42),basalt,true)
	for i in range(11):
		var x := -2.75 + 0.48 * i
		var rock := _box(Vector3(x,2.01,-1.56),Vector3(0.55,0.35+0.16*sin(i),1.40),stones)
		rock.rotation.y = 0.14 * sin(i * 1.8)
	for edge in [
		[Vector3(-13,0.8,0),Vector3(.15,1.6,24)],
		[Vector3(13,0.8,0),Vector3(.15,1.6,24)],
		[Vector3(0,0.8,-12),Vector3(26,1.6,.15)],
		[Vector3(0,0.8,12),Vector3(26,1.6,.15)]]:
		var wall := StaticBody3D.new()
		add_child(wall)
		wall.position = edge[0]
		var bounds := BoxShape3D.new()
		bounds.size = edge[1]
		_shape(wall, bounds)
	for loc in [Vector3(-4,0,4),Vector3(6.9,0,3),Vector3(8.6,0,-5.7),Vector3(-5.8,0,-4.8),Vector3(2.8,0,-8),Vector3(10,0,6.4),Vector3(-8,0,1)]:
		_palm(loc)
	var rng := RandomNumberGenerator.new()
	rng.seed = 713
	for i in range(21):
		var at := Vector3(-29.0 + i * 3.0, 1.0, -24.0 - rng.randf_range(0.0,11.0))
		var peak := CylinderMesh.new()
		peak.radial_segments = 5
		peak.top_radius = 0
		peak.bottom_radius = rng.randf_range(3.4,7.4)
		peak.height = rng.randf_range(4.5,12)
		var hill := _mesh(peak, _material(Color("#486565").lerp(Color("#739489"), rng.randf())), self,at)
		hill.rotation.y = rng.randf() * TAU
	for i in range(48):
		var x := rng.randf_range(-12,12)
		var z := rng.randf_range(-11,11)
		if absf(x) < 2.6 or (x > 2 and x < 7):
			continue
		var sprig := CylinderMesh.new()
		sprig.radial_segments = 3
		sprig.top_radius = 0
		sprig.bottom_radius = 0.13
		sprig.height = rng.randf_range(.16,.48)
		_mesh(sprig,_material(Color("#5b774c")),self,Vector3(x,sprig.height * 0.5,z))

func _palm(at: Vector3) -> void:
	var bark := CylinderMesh.new()
	bark.radial_segments = 6
	bark.top_radius = 0.09
	bark.bottom_radius = 0.22
	bark.height = 3.65
	_mesh(bark,_material(Color("#806344")),self,at + Vector3(0,1.8,0)).rotation.z = -0.10
	var leaf_mat := _material(Color("#416747"))
	for i in range(7):
		var fan := SurfaceTool.new()
		fan.begin(Mesh.PRIMITIVE_TRIANGLES)
		var points := [Vector3(0,0,0),Vector3(-.30,.20,1),Vector3(0,-.29,1.85),Vector3(.32,.19,1)]
		for index in [0,2,1,0,3,2,0,1,2,0,2,3]:
			fan.add_vertex(points[index])
		fan.generate_normals()
		_mesh(fan.commit(),leaf_mat,self,at + Vector3(.17,3.55,0)).rotation.y = i * TAU / 7.0

func _build_player() -> void:
	player = CharacterBody3D.new()
	add_child(player)
	player.collision_layer = 2
	player.collision_mask = 1
	var capsule := CapsuleShape3D.new()
	capsule.radius = .32
	capsule.height = 1.82
	var collision := CollisionShape3D.new()
	collision.shape = capsule
	player.add_child(collision)
	collision.position.y = .92
	body = Node3D.new()
	player.add_child(body)
	model = BOBBY.instantiate()
	body.add_child(model)
	model.scale = Vector3.ONE * .72
	left_arm = _joint(["Short sleeve","Sleeve hem","Upper arm","Forearm","Hand","Thumb"],"",Vector3(-.32,1.76,0))
	right_arm = _joint(["Short sleeve","Sleeve hem","Upper arm","Forearm","Hand","Thumb"],".001",Vector3(.32,1.76,0))
	for side in [-1,1]:
		var suffix := "" if side < 0 else ".001"
		legs.append(_joint(["Khaki leg","Trouser cuff","Suede shoe","Outsole"],suffix,Vector3(side*.14,1.19,0)))
	weapon = Node3D.new()
	right_arm.add_child(weapon)
	weapon.position = Vector3(.259,-.54,.083)
	weapon.rotation.x = 2.78
	var handle := BoxMesh.new()
	handle.size = Vector3(.075,.23,.075)
	_mesh(handle,_material(Color("#553f32")),weapon,Vector3(0,-.07,0))
	var blade := CylinderMesh.new()
	blade.radial_segments = 4
	blade.bottom_radius = .105
	blade.top_radius = .029
	blade.height = .82
	_mesh(blade,_material(Color("#c99b59")),weapon,Vector3(0,.48,0)).scale.z = .47
	var guard := BoxMesh.new()
	guard.size = Vector3(.30,.065,.10)
	_mesh(guard,_material(Color("#99704c")),weapon,Vector3(0,.07,0))
	swing = AnimationPlayer.new()
	swing.root_node = NodePath("..")
	body.add_child(swing)
	var attack := Animation.new()
	attack.length = SWING_LENGTH
	var track := attack.add_track(Animation.TYPE_VALUE)
	attack.track_set_path(track, NodePath(str(body.get_path_to(right_arm)) + ":rotation"))
	for pose in [
		[0.0,Vector3(-.13,0,-.14)], [.19,Vector3(-1.64,.92,-.58)],
		[.31,Vector3(-1.34,-.80,-.18)], [.40,Vector3(-.83,-1.01,-.12)],
		[SWING_LENGTH,Vector3(-.13,0,-.14)]]:
		attack.track_insert_key(track,pose[0],pose[1])
	var library := AnimationLibrary.new()
	library.add_animation("swing",attack)
	swing.add_animation_library("",library)
	# The camera pivots with input while Bobby can face any travel direction.
	pivot = Node3D.new()
	player.add_child(pivot)
	pivot.position.y = 1.44
	spring = SpringArm3D.new()
	spring.collision_mask = 1
	spring.spring_length = 4.72
	spring.margin = .15
	var probe := SphereShape3D.new()
	probe.radius = .23
	spring.shape = probe
	pivot.add_child(spring)
	spring.rotation.x = -.25
	camera = Camera3D.new()
	camera.fov = 56
	spring.add_child(camera)
	camera.current = true

func _joint(parts: Array, suffix: String, at: Vector3) -> Node3D:
	var joint := Node3D.new()
	joint.name = "Limb" + str(model.get_child_count())
	model.add_child(joint)
	joint.position = at
	for part in parts:
		var node := model.find_child(part + suffix, true, false) as Node3D
		if node == null and not suffix.is_empty():
			node = model.find_child(part + "_001", true, false) as Node3D
		if node == null and not suffix.is_empty():
			node = model.find_child(part + "001", true, false) as Node3D
		if node == null:
			push_error("Missing model part: " + part + suffix)
		else:
			node.reparent(joint, true)
	return joint

func _build_rina() -> void:
	rina = Node3D.new()
	add_child(rina)
	var gradient := Gradient.new()
	gradient.colors = PackedColorArray([Color("#fff2fb"),Color("#fa71bd"),Color(0.94,.3,.64,0)])
	gradient.offsets = PackedFloat32Array([0,.31,1])
	var texture := GradientTexture2D.new()
	texture.gradient = gradient
	texture.fill = GradientTexture2D.FILL_RADIAL
	texture.fill_from = Vector2(.5,.5)
	texture.fill_to = Vector2(1,.5)
	var halo := Sprite3D.new()
	halo.texture = texture
	halo.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	halo.pixel_size = .0145
	rina.add_child(halo)
	var spark := SphereMesh.new()
	spark.radius = .088
	spark.height = .176
	spark.radial_segments = 6
	spark.rings = 3
	var core := _material(Color("#ffe6f6"))
	core.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_mesh(spark,core,rina,Vector3.ZERO)

func _build_target() -> void:
	target = Node3D.new()
	add_child(target)
	target.position = Vector3(4.62,0,-5.25)
	var rock := SphereMesh.new()
	rock.radial_segments = 6
	rock.rings = 2
	rock.radius = .65
	rock.height = 1.48
	_mesh(rock,_material(Color("#5c7475")),target,Vector3(0,.76,0))
	var eye := BoxMesh.new()
	eye.size = Vector3(.15,.095,.065)
	for x in [-.21,.21]:
		_mesh(eye,_material(Color("#ffd48d")),target,Vector3(x,1.0,.52))
	var area := Area3D.new()
	area.collision_layer = TARGET_LAYER
	area.collision_mask = 0
	target.add_child(area)
	area.position.y = .74
	var hurtbox := SphereShape3D.new()
	hurtbox.radius = .61
	_shape(area,hurtbox)

func _audio(from: float, to: float, duration: float, noisy: bool) -> AudioStreamPlayer:
	var data := PackedByteArray()
	var rate := 22050
	var phase := 0.0
	var rng := RandomNumberGenerator.new()
	rng.seed = 51
	for i in range(int(rate * duration)):
		var progress := float(i) / float(rate) / duration
		phase += TAU * lerpf(from,to,progress) / rate
		var waveform := sin(phase)
		if noisy:
			waveform = waveform*.72 + rng.randf_range(-.28,.28)
		var amp := floori(waveform * pow(1.0-progress,2.1) * minf(progress*40,1.0) * 49)
		data.append(amp & 255)
	var sample := AudioStreamWAV.new()
	sample.format = AudioStreamWAV.FORMAT_8_BITS
	sample.mix_rate = rate
	sample.data = data
	var audio := AudioStreamPlayer.new()
	audio.stream = sample
	add_child(audio)
	return audio

func _restart() -> void:
	player.position = Vector3(0,.04,5.45)
	player.velocity = Vector3.ZERO
	body.rotation = Vector3(0,PI,0)
	pivot.rotation.y = 0
	spring.rotation.x = -.25
	rina.position = player.position + Vector3(.78,1.55,.5)
	target.rotation = Vector3.ZERO
	target.scale = Vector3.ONE
	trail = [player.position]
	dialogue = false
	said_hello = false
	drag = false
	hits = 0
	swings = 0
	active_swing = false
	locked_hit = false
	strike_freeze = 0
	target_flash = 0
	swing.stop()
	swing.speed_scale = 1.0
	right_arm.rotation = Vector3.ZERO
	_publish()

func _web_action(args: Array) -> void:
	if args.is_empty():
		return
	match str(args[0]):
		"start":
			ready_to_play = true
			chirp.play()
		"restart":
			_restart()
		"line":
			var text := str(args[1]).strip_edges().left(160)
			if not text.is_empty():
				preview_line = text
		"reset_line":
			preview_line = original_line
		"replay":
			if ready_to_play and not active_swing:
				_open_dialogue()
		"continue":
			_close_dialogue()
	_publish()

func _open_dialogue() -> void:
	dialogue = true
	player.velocity = Vector3.ZERO
	chirp.play()
	_publish()

func _close_dialogue() -> void:
	if dialogue:
		said_hello = true
	dialogue = false
	_publish()

func _can_talk() -> bool:
	return player.position.x > 2.85 and player.position.z < 1.25 and player.position.z > -3.8 and (
		Vector2(player.position.x - rina.position.x, player.position.z - rina.position.z).length() < 2.0)

func _input(event: InputEvent) -> void:
	if not ready_to_play:
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_RIGHT:
		drag = event.pressed and not dialogue
	if dialogue:
		if event.is_action_pressed("talk") or event.is_action_pressed("attack"):
			_close_dialogue()
		return
	if event is InputEventMouseMotion and drag:
		pivot.rotation.y -= event.relative.x * .008
		spring.rotation.x = clampf(spring.rotation.x - event.relative.y * .006, -.66, -.08)
	if event.is_action_pressed("recenter"):
		pivot.rotation.y = body.rotation.y - PI
	if event.is_action_pressed("talk") and _can_talk() and not active_swing:
		_open_dialogue()
	elif event.is_action_pressed("attack") and not active_swing:
		active_swing = true
		locked_hit = false
		swings += 1
		swing.play("swing")
		whoosh.play()

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		drag = false
		for action in ["forward","back","left","right","orbit_left","orbit_right"]:
			Input.action_release(action)

func _physics_process(dt: float) -> void:
	if not ready_to_play:
		return
	clock += dt
	if dialogue:
		stride = move_toward(stride,0.0,dt*8)
	else:
		pivot.rotation.y += Input.get_axis("orbit_right","orbit_left") * dt * 1.65
		var input := Input.get_vector("left","right","forward","back")
		var direction := Vector3(input.x,0,input.y).rotated(Vector3.UP,pivot.rotation.y)
		var speed := 0.78 if active_swing else WALK_SPEED
		player.velocity.x = move_toward(player.velocity.x,direction.x*speed,dt*19)
		player.velocity.z = move_toward(player.velocity.z,direction.z*speed,dt*19)
		player.velocity.y = -2.2
		player.move_and_slide()
		if direction.length_squared() > .01 and not active_swing:
			body.rotation.y = lerp_angle(body.rotation.y,atan2(direction.x,direction.z),minf(1.0,dt*15))
		stride = move_toward(stride,minf(1.0,Vector2(player.velocity.x,player.velocity.z).length()/WALK_SPEED),dt*8)
		var gait := sin(clock*13) * stride
		legs[0].rotation.x = gait * .42
		legs[1].rotation.x = -gait * .42
		left_arm.rotation.x = -gait * .29 - .12
		if not active_swing:
			right_arm.rotation = Vector3(gait*.22-.13,0,-.14)
		if strike_freeze > 0:
			strike_freeze -= dt
			swing.speed_scale = 0.0 if strike_freeze > 0 else 1.0
		elif active_swing:
			if not swing.is_playing():
				active_swing = false
			elif not locked_hit and swing.current_animation_position >= .21 and swing.current_animation_position <= .40:
				_check_hit()
	_follow_rina(dt)
	target_flash = maxf(0.0,target_flash-dt*2.1)
	target.rotation.z = sin(target_flash*12) * target_flash * .18
	target.scale = Vector3(1+.09*target_flash,1-.15*target_flash,1+.09*target_flash)
	var rock := target.get_child(0) as MeshInstance3D
	var material := rock.material_override as StandardMaterial3D
	material.albedo_color = Color("#5c7475").lerp(Color("#f1c779"),target_flash)
	telemetry_clock += dt
	if telemetry_clock >= .08:
		telemetry_clock = 0
		_publish()

func _follow_rina(dt: float) -> void:
	var position_now := player.position
	if trail.back().distance_to(position_now) > .18:
		trail.push_back(position_now)
	while trail.size() > 1 and trail[0].distance_to(position_now) > TRAIL_GAP and rina.position.distance_to(trail[0]+Vector3(0,1.5,0)) < .43:
		trail.pop_front()
	# Pause behind Bobby at the trail's end, then settle to one side at rest.
	while trail.size() > 13:
		trail.pop_front()
	var follow := trail[0]
	if trail.size() == 1 or (stride < .13 and trail[0].distance_to(position_now) < TRAIL_GAP * 1.20):
		follow = position_now + Vector3(.88,0,-.52).rotated(Vector3.UP,body.rotation.y)
	var desired := follow + Vector3(0,1.54 + sin(clock*4.4)*.11,0)
	if dialogue:
		desired = position_now + Vector3(.72,1.68,.34).rotated(Vector3.UP,body.rotation.y)
	rina.position = rina.position.move_toward(desired,dt*5.15)

func _check_hit() -> void:
	var sphere := SphereShape3D.new()
	sphere.radius = .17
	var query := PhysicsShapeQueryParameters3D.new()
	query.shape = sphere
	query.collision_mask = TARGET_LAYER
	query.collide_with_areas = true
	query.collide_with_bodies = false
	var space := get_world_3d().direct_space_state
	for distance in [.22,.42,.62,.84]:
		query.transform = Transform3D(Basis.IDENTITY,weapon.to_global(Vector3(0,distance,0)))
		if space.intersect_shape(query,1).is_empty():
			continue
		locked_hit = true
		hits += 1
		target_flash = 1.0
		strike_freeze = .075
		swing.speed_scale = 0.0
		impact.play()
		_publish()
		break

func _publish() -> void:
	if not bridge:
		return
	var p := player.position
	var r := rina.position
	bridge.renderState(JSON.stringify({
		"dialogue":dialogue,"line":preview_line,"talk":_can_talk(),"saidHello":said_hello,
		"hits":hits,"swings":swings,"swing":active_swing,
		"arm":spring.get_hit_length(),"x":p.x,"z":p.z,"yaw":pivot.rotation.y,
		"rinaX":r.x,"rinaZ":r.z,"rinaDistance":Vector2(r.x-p.x,r.z-p.z).length()
	}))
