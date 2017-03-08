function ha_status(stream, dash, widgets)
{

    var webSocket = new ReconnectingWebSocket(stream);
            
    webSocket.onopen = function (event) 
    {
        webSocket.send(dash);
    }

    webSocket.onmessage = function (event) 
    {
        Object.keys(widgets).forEach(function (key)
        {
            if ("on_ha_data" in widgets[key])
            {
                widgets[key].on_ha_data(JSON.parse(event.data));
            }
        })
    }
    webSocket.onclose = function (event)
    {
        //window.alert("Server closed connection")
       // window.location.reload(false); 
    }

    webSocket.onerror = function (event)
    {
        //window.alert("Error occured")
        //window.location.reload(true);         
    }
}

function round(value, exp) 
{

  if (typeof exp === 'undefined' || +exp === 0)
    return Math.round(value);

  value = +value;
  exp = +exp;

  if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0))
    return NaN;

  // Shift
  value = value.toString().split('e');
  value = Math.round(+(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp)));

  // Shift back
  value = value.toString().split('e');
  return +(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp));
}

var inheritsFrom = function (child, parent) {
    child.prototype = Object.create(parent.prototype);
};

var WidgetBase = function(widget_id, url, skin, parameters, monitored_entities, callbacks)
{
    child = this
    child.url = url
    
    // Function definitions
    
    this.set_field = function(self, field, value)
    {
        self.ViewModel[field](value)
    }
    
    this.set_icon = function(self, field, value)
    {
        self.ViewModel[field](value.split("-")[0] + ' ' + value)
    }
    
    this.get_state = function(child, base_url, entity)
    {
        state_url = base_url + "/state/" + entity.entity;
        $.get(state_url, "", function(data)
        {
            if (data.state == null)
            {
                child.ViewModel.title("entity not found: " + entity.entity)
                new_state = null
            }
            else
            {
                new_state = data.state
                if ("title_is_friendly_name" in child.parameters 
                && child.parameters.title_is_friendly_name == 1
                && "friendly_name" in new_state.attributes)
                {
                    child.ViewModel.title(new_state.attributes.friendly_name)
                }
                if (typeof child.entity_state === 'undefined')
                {
                    child.entity_state = {}
                }
                child.entity_state[entity.entity] = new_state
                entity.initial(child, new_state)
            }
        });
    }
   
    this.on_ha_data = function(data)
    {
        entity = data.data.entity_id;
        elen = monitored_entities.length;
        if (data.event_type == "state_changed")
        {
            for (i=0;i < elen;i++)
            {
                if (monitored_entities[i].entity == entity)
                {
                    this.entity_state[entity] = data.data.new_state
                    monitored_entities[i].update(this, data.data.new_state)
                }
            }
        }
    }
    
    this.call_service = function(child, args)
    {
        service_url = child.url + "/" + "call_service";
        $.post(service_url, args); 
    }

    // Initialization
    
    // Grab current status for entities
    
    elen = monitored_entities.length;
    for (i=0;i < elen;i++)
    {
        this.get_state(child, url, monitored_entities[i])
    }

    clen = callbacks.length;
    for (i=0;i < clen;i++)
    {
        $(callbacks[i].selector).click((
            function(callback, ch)
            {
                return function()
                {
                    callback(ch)
                };
            }(callbacks[i].callback, child))
        );
    }
    
    // Create and initialize bindings
    
    child.ViewModel = {}
    
    Object.keys(parameters.fields).forEach(function(key,index)
    {
        child.ViewModel[key] = ko.observable()
    });

    child.css = {}
    Object.keys(parameters.css).forEach(function(key,index) 
    {
        child.css[key] = parameters.css[key]
        child.ViewModel[key] = ko.observable()
    });
    
    Object.keys(parameters.static_css).forEach(function(key,index) 
    {
        child.ViewModel[key] = ko.observable()
    });
    
    child.icons = {}
    Object.keys(parameters.icons).forEach(function(key,index) 
    {
        child.icons[key] = parameters.icons[key]
        child.ViewModel[key] = ko.observable()
    });
    
    Object.keys(parameters.static_icons).forEach(function(key,index) 
    {
        child.ViewModel[key] = ko.observable()
    });
    
    ko.applyBindings(child.ViewModel, document.getElementById(widget_id));
    
    // Set any static values
    
    Object.keys(parameters.fields).forEach(function(key,index)
    {
        child.ViewModel[key](parameters.fields[key])
    });

    Object.keys(parameters.static_css).forEach(function(key,index) 
    {
        child.ViewModel[key](parameters.static_css[key])
    });

    Object.keys(parameters.static_icons).forEach(function(key,index) 
    {
        child.ViewModel[key](parameters.static_icons[key].split("-")[0] + ' ' + parameters.static_icons[key])
    });
}