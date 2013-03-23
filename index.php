<?php
session_cache_limiter(false);
session_start();

$dir = basename(dirname(__FILE__));
$basePath = '';

// basePath gesetzt
if (($pos = stripos($_SERVER['SCRIPT_NAME'], $dir)) !== FALSE) {
	$basePath = substr($_SERVER['SCRIPT_NAME'], 0, $pos + strlen($dir));
}

require 'vendor/autoload.php';

function return_json($app, $data) {
	$response = $app->response();
	$response['Content-Type'] = 'application/json';
	$response->status(200);
	$response->body(json_encode($data));
}

function create_response($app, $data, $view) {
	$request = $app->request();
	$headers = $request->headers();

	if (strpos($headers['ACCEPT'], "application/json") !== FALSE)
	{
		return_json($app, $data);
	}
	else {
		
		if (isset($headers['X_REQUESTED_WITH']) && (strtolower($headers['X_REQUESTED_WITH']) == 'xmlhttprequest')) {
			echo $app->render($view, $data);
		}
		else {
			echo $app->render('index.html', array('subview' => $view, 'data' => $data));
		}
	}
}

function find_one($data, $value, $key = 'id') {
	$r = find($data, $value, $key);

	if (sizeof($r) > 0) {
		return $r[0];
	}

	return null;
}

function find($data, $value, $key = 'id') {
	$r = array();
	for ($i = 0, $m = sizeof($data); $i < $m; $i++) {
		$entry = $data[$i];
		if (isset($entry[$key])) {
			if (preg_match("/$value/i", $entry[$key])) {
				array_push($r, $entry);
			}
		}
	}

	return $r;
}

class MetaBuilder
{
	public $_kontext = "root";
	public $_parent = "root";

	public static $_config = array('basePath' => '');

	public static function create($kontext = null, $parent = null) {
		$r = new MetaBuilder();

		if ($kontext != null) {
			$r->_kontext = $kontext;
		}

		if ($parent != null) {
			$r->_parent = $parent;
		}

		return $r;
	}

	private $_actions = array();

	public function delegatesTo($name, $url) {
		$this->_actions[$name] = self::$_config['basePath'] . $url;
		return $this;
	}

	private $_perms = array();

	public function withPermissions($perms) {
		if (!is_array($perms)) {
			$perms = array($perms);
		}

		for ($i = 0, $m = sizeof($perms); $i < $m; $i++) {
			if (!in_array($perms[$i], $this->_perms)) {
				array_push($this->_perms, $perms[$i]);
			}
		}

		return $this;
	}

	private $_refs = array();

	public function hasReferencedData($name, $url) {
		$this->_refs[$name] = $url;
		return $this;
	}

	public function build() {
		return array(
			'__base__' => self::$_config['basePath'],
			'actions' => $this->_actions,
			'auth' => array('kontext' => $this->_kontext, 'parent' => $this->_parent, 'permissions' => $this->_perms),
			'refs' => $this->_refs
		);
	}
}

MetaBuilder::$_config['basePath'] = $basePath;

class Mock
{
}
$mocks = new Mock();

$app = new \Slim\Slim();
$app->get('/', function() use ($app) {
	$app->redirect('start');
});

$app->get('/start', function() use ($app) {
	$data['meta'] = MetaBuilder::create()
			->delegatesTo('list_benutzer', $app->urlFor('list_benutzer'))
			->delegatesTo('list_autos', $app->urlFor('list_autos'))
			->withPermissions(array('auto:create', 'auto:list', 'benutzer:list'))
			->build();
	create_response($app, $data, 'start.phtml');
});

$app->delete('/benutzer/:id', function($benutzerId) use($app, $mocks) {
	$app->flash('info', "Benutzer mit der ID " . $benutzerId . " wurde gelöscht");
});

$app->get('/benutzer', function() use($app, $mocks) {
	$data['benutzer'] = array(array('id' => 1, 'vorname' => 'vorname1', 'nachname' => 'nachname1'), array('id' => 2, 'vorname' => 'vorname2', 'nachname' => 'nachname2'));
	$data['meta'] = MetaBuilder::create('benutzer')
			->delegatesTo('entry_benutzer', '/benutzer{/id}')
			->withPermissions('benutzer:delete')
			->withPermissions('benutzer:edit')
			->withPermissions('benutzer:view')
			->build();
	create_response($app, $data, 'list_benutzer.phtml');
})->name('list_benutzer');

$app->get('/benutzer/:id', function($id) use($app, $mocks) {
	$data['data'] = array('id' => 1, 'vorname' => 'vorname1', 'nachname' => 'nachname1');
	$data['meta'] = MetaBuilder::create('benutzer')
			->delegatesTo('all_benutzer', '/benutzer/:id')
			->delegatesTo('self', '/benutzer/' . $id)
			->hasReferencedData('all_autos', '/auto')
			->hasReferencedData('assigned_autos', '/auto/?benutzer=' . $id)
			->withPermissions('benutzer:edit')
			->withPermissions('benutzer:delete')
			->build();
	create_response($app, $data, 'view_edit_benutzer.phtml');
})->name('edit_benutzer');

$app->post('/benutzer/:id', function($id) use($app, $mocks) {
	$a = array('errors' => array(array('property' => 'vorname', 'message' => 'Der Vorname muss aus 189 Buchstaben bestehen. Mindestens.'), array('property' => 'timeout', 'message' => 'Timeout beim Abfragen des Backends')));
	$b = array('data' => array('id' => 1, 'vorname' => 'Neuer Vorname', 'nachname' => 'Neuer Nachname'));
	$select = array($a, $b);

	create_response($app, $select[rand(0, (sizeof($select) - 1))], 'view_edit_benutzer.phtml');
});

$app->get('/auto', function() use($app, $mocks) {
	return_json($app, $mocks->getFahrer());
})->name('list_autos');

$app->get('/auto/:id', function($id) use($app, $mocks) {
	return_json($app, find_one($mocks->getFahrer(), $id));
});

$app->run();
