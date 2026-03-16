'use strict';

var connection = new Postmonger.Session();
var activityPayload = {};
var schema = [];
var eventDefinitionKey = '';
var currentMid = '';

// ---- Postmonger lifecycle ----

connection.trigger('ready');

connection.on('initActivity', function (payload) {
  activityPayload = payload || {};

  console.log('[WhatsApp OTT] initActivity payload:', JSON.stringify(activityPayload, null, 2));

  var args = mergeInArguments(
    (activityPayload.arguments &&
      activityPayload.arguments.execute &&
      activityPayload.arguments.execute.inArguments) || []
  );

  // Restore saved values
  if (args.mid) {
    currentMid = args.mid;
    document.getElementById('defMid').value = currentMid;
    document.getElementById('cfgMid').value = currentMid;
  }

  if (args.definitionKey) {
    // Load definitions for the saved MID then select the right one
    if (currentMid) {
      loadDefinitions(currentMid, function () {
        document.getElementById('cfgDefinitionKey').value = args.definitionKey;
      });
    }
  }

  connection.trigger('requestSchema');
  connection.trigger('requestTriggerEventDefinition');

  // Always show home
  showStep('stepHome');
});

connection.on('requestedTriggerEventDefinition', function (eventDef) {
  if (eventDef) {
    eventDefinitionKey = eventDef.eventDefinitionKey || '';
  }
});

connection.on('requestedSchema', function (data) {
  schema = data && data.schema ? data.schema : [];
  populateFieldDropdowns(schema);

  var args = mergeInArguments(
    (activityPayload.arguments &&
      activityPayload.arguments.execute &&
      activityPayload.arguments.execute.inArguments) || []
  );

  if (args.contactKey) {
    document.getElementById('cfgContactKey').value = args.contactKey;
  }
  if (args.to) {
    document.getElementById('cfgTo').value = args.to;
  }
});

// JB step navigation
connection.on('clickedNext', function () {
  saveActivity();
  connection.trigger('nextStep');
});

connection.on('clickedBack', function () {
  connection.trigger('prevStep');
});

connection.on('gotoStep', function (step) {
  showStep(step.key);
});

// ---- Navigation ----

function showStep(stepId) {
  var steps = document.querySelectorAll('.step');
  for (var i = 0; i < steps.length; i++) {
    steps[i].classList.remove('active');
  }
  document.getElementById(stepId).classList.add('active');
}

document.getElementById('cardCreate').addEventListener('click', function () {
  showStep('step1');
});

document.getElementById('cardExisting').addEventListener('click', function () {
  showStep('step2');
});

document.getElementById('btnBackToHome').addEventListener('click', function () {
  showStep('stepHome');
});

document.getElementById('btnBackToHome2').addEventListener('click', function () {
  showStep('stepHome');
});

document.getElementById('btnClose').addEventListener('click', function () {
  connection.trigger('destroy');
});

document.getElementById('btnSave').addEventListener('click', function () {
  saveActivity();
});

// ---- Load definitions by MID ----

document.getElementById('cfgMid').addEventListener('change', function () {
  var mid = this.value;
  currentMid = mid;
  if (mid) {
    loadDefinitions(mid);
  } else {
    var sel = document.getElementById('cfgDefinitionKey');
    sel.innerHTML = '<option value="">-- Selecione a BU primeiro --</option>';
  }
});

function loadDefinitions(mid, callback) {
  var sel = document.getElementById('cfgDefinitionKey');
  sel.innerHTML = '<option value="">Carregando...</option>';

  fetch('/activity/definitions?mid=' + encodeURIComponent(mid))
    .then(function (resp) { return resp.json(); })
    .then(function (data) {
      sel.innerHTML = '<option value="">-- Selecione uma definition --</option>';
      var defs = data.definitions || [];
      defs.forEach(function (def) {
        var opt = document.createElement('option');
        opt.value = def.definitionKey;
        opt.textContent = def.name + ' (' + def.definitionKey + ')';
        sel.appendChild(opt);
      });
      if (callback) callback();
    })
    .catch(function (err) {
      console.error('Error loading definitions:', err);
      sel.innerHTML = '<option value="">Erro ao carregar definitions</option>';
    });
}

// ---- Field dropdowns ----

function populateFieldDropdowns(schemaFields) {
  var contactKeySelect = document.getElementById('cfgContactKey');
  var toSelect = document.getElementById('cfgTo');

  contactKeySelect.innerHTML = '<option value="">-- Selecione um campo --</option>';
  toSelect.innerHTML = '<option value="">-- Selecione um campo --</option>';

  if (!schemaFields || schemaFields.length === 0) return;

  schemaFields.forEach(function (field) {
    var key = field.key || '';
    var name = field.name || key;
    var bindingExpr = '{{' + key + '}}';

    var opt1 = document.createElement('option');
    opt1.value = bindingExpr;
    opt1.textContent = name;
    contactKeySelect.appendChild(opt1);

    var opt2 = document.createElement('option');
    opt2.value = bindingExpr;
    opt2.textContent = name;
    toSelect.appendChild(opt2);
  });
}

// ---- Save / helpers ----

function mergeInArguments(inArguments) {
  if (!Array.isArray(inArguments)) return {};
  return inArguments.reduce(function (acc, obj) {
    var key = Object.keys(obj)[0];
    acc[key] = obj[key];
    return acc;
  }, {});
}

function saveActivity() {
  var cfgMid = document.getElementById('cfgMid').value;
  if (cfgMid) currentMid = cfgMid;

  var definitionKey = document.getElementById('cfgDefinitionKey').value;
  var contactKey = document.getElementById('cfgContactKey').value;
  var to = document.getElementById('cfgTo').value;

  activityPayload.arguments = activityPayload.arguments || {};
  activityPayload.arguments.execute = activityPayload.arguments.execute || {};
  activityPayload.arguments.execute.inArguments = [
    { contactKey: contactKey },
    { to: to },
    { definitionKey: definitionKey },
    { mid: currentMid }
  ];

  activityPayload.metaData = activityPayload.metaData || {};
  activityPayload.metaData.isConfigured = true;

  connection.trigger('updateActivity', activityPayload);
}

// ---- Create Definition ----

document.getElementById('btnCreateDef').addEventListener('click', function () {
  var btn = this;
  var statusEl = document.getElementById('createDefStatus');

  var mid = document.getElementById('defMid').value;
  var defKey = document.getElementById('defKey').value.trim();
  var defName = document.getElementById('defName').value.trim();
  var senderId = document.getElementById('senderId').value.trim();
  var customerKey = document.getElementById('customerKey').value.trim();
  var description = document.getElementById('defDescription').value.trim();

  currentMid = mid;

  if (!mid || !defKey || !defName || !senderId || !customerKey) {
    statusEl.className = 'error';
    statusEl.textContent = 'Preencha todos os campos obrigatorios (incluindo MID).';
    statusEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Criando...';
  statusEl.style.display = 'none';

  fetch('/activity/create-definition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      definitionKey: defKey,
      name: defName,
      senderId: senderId,
      customerKey: customerKey,
      description: description,
      mid: mid
    })
  })
    .then(function (resp) {
      return resp.json().then(function (data) {
        return { ok: resp.ok, data: data };
      });
    })
    .then(function (result) {
      if (result.ok) {
        statusEl.className = 'success';
        statusEl.textContent = 'Definition criada com sucesso! Key: ' + defKey;
        // Sync MID to step2 and load definitions
        document.getElementById('cfgMid').value = mid;
        loadDefinitions(mid, function () {
          document.getElementById('cfgDefinitionKey').value = defKey;
        });
        setTimeout(function () { showStep('step2'); }, 1500);
      } else {
        statusEl.className = 'error';
        statusEl.textContent =
          'Erro: ' + (result.data.error?.message || JSON.stringify(result.data.error) || 'Erro desconhecido');
      }
      statusEl.style.display = 'block';
    })
    .catch(function (err) {
      statusEl.className = 'error';
      statusEl.textContent = 'Erro de rede: ' + err.message;
      statusEl.style.display = 'block';
    })
    .finally(function () {
      btn.disabled = false;
      btn.textContent = 'Criar Definition';
    });
});
