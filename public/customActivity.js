'use strict';

var connection = new Postmonger.Session();
var activityPayload = {};
var schema = [];
var eventDefinitionKey = '';

// ---- Postmonger lifecycle ----

// Wait for JB to signal it's ready, then respond
connection.on('ready', function () {
  connection.trigger('ready');
});

connection.on('initActivity', function (payload) {
  activityPayload = payload || {};

  // Restore saved values if editing an existing activity
  var args = mergeInArguments(
    (activityPayload.arguments &&
      activityPayload.arguments.execute &&
      activityPayload.arguments.execute.inArguments) || []
  );

  if (args.definitionKey) {
    document.getElementById('cfgDefinitionKey').value = args.definitionKey;
  }

  // Request schema to populate field dropdowns
  connection.trigger('requestSchema');
  connection.trigger('requestTriggerEventDefinition');
});

connection.on('requestedTriggerEventDefinition', function (eventDef) {
  if (eventDef) {
    eventDefinitionKey = eventDef.eventDefinitionKey || '';
  }
});

connection.on('requestedSchema', function (data) {
  schema = data && data.schema ? data.schema : [];
  populateFieldDropdowns(schema);

  // Restore selected field values after populating dropdowns
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

// Step navigation from JB
connection.on('clickedNext', function () {
  var currentStep = getCurrentStep();

  if (currentStep === 'step1') {
    // Moving from step1 to step2: auto-fill definitionKey if created
    var defKey = document.getElementById('defKey').value.trim();
    var cfgField = document.getElementById('cfgDefinitionKey');
    if (defKey && !cfgField.value) {
      cfgField.value = defKey;
    }
    showStep('step2');
    connection.trigger('nextStep');
  } else if (currentStep === 'step2') {
    // Final step: save the activity
    saveActivity();
    connection.trigger('nextStep');
  }
});

connection.on('clickedBack', function () {
  var currentStep = getCurrentStep();
  if (currentStep === 'step2') {
    showStep('step1');
    connection.trigger('prevStep');
  }
});

connection.on('gotoStep', function (step) {
  showStep(step.key);
});

// ---- UI logic ----

function getCurrentStep() {
  var steps = document.querySelectorAll('.step');
  for (var i = 0; i < steps.length; i++) {
    if (steps[i].classList.contains('active')) {
      return steps[i].id;
    }
  }
  return 'step1';
}

function showStep(stepId) {
  var steps = document.querySelectorAll('.step');
  for (var i = 0; i < steps.length; i++) {
    steps[i].classList.remove('active');
  }
  document.getElementById(stepId).classList.add('active');
}

function populateFieldDropdowns(schemaFields) {
  var contactKeySelect = document.getElementById('cfgContactKey');
  var toSelect = document.getElementById('cfgTo');

  // Clear existing options (keep placeholder)
  contactKeySelect.innerHTML = '<option value="">-- Selecione um campo --</option>';
  toSelect.innerHTML = '<option value="">-- Selecione um campo --</option>';

  if (!schemaFields || schemaFields.length === 0) return;

  schemaFields.forEach(function (field) {
    var key = field.key || '';
    var name = field.name || key;

    // Build JB data binding expression
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

function mergeInArguments(inArguments) {
  if (!Array.isArray(inArguments)) return {};
  return inArguments.reduce(function (acc, obj) {
    var key = Object.keys(obj)[0];
    acc[key] = obj[key];
    return acc;
  }, {});
}

function saveActivity() {
  var definitionKey = document.getElementById('cfgDefinitionKey').value.trim();
  var contactKey = document.getElementById('cfgContactKey').value;
  var to = document.getElementById('cfgTo').value;

  activityPayload.arguments = activityPayload.arguments || {};
  activityPayload.arguments.execute = activityPayload.arguments.execute || {};
  activityPayload.arguments.execute.inArguments = [
    { contactKey: contactKey },
    { to: to },
    { definitionKey: definitionKey }
  ];

  activityPayload.metaData = activityPayload.metaData || {};
  activityPayload.metaData.isConfigured = true;

  connection.trigger('updateActivity', activityPayload);
}

// ---- Create Definition button ----

document.getElementById('btnCreateDef').addEventListener('click', function () {
  var btn = this;
  var statusEl = document.getElementById('createDefStatus');

  var defKey = document.getElementById('defKey').value.trim();
  var defName = document.getElementById('defName').value.trim();
  var senderId = document.getElementById('senderId').value.trim();
  var customerKey = document.getElementById('customerKey').value.trim();
  var description = document.getElementById('defDescription').value.trim();

  if (!defKey || !defName || !senderId || !customerKey) {
    statusEl.className = 'error';
    statusEl.textContent = 'Preencha todos os campos obrigatorios.';
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
      description: description
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
