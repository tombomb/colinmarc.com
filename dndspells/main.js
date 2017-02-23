var searchSpellTemplate = `
<tr class="spell searchspell">
  <td class="levelcol">{{level}}</td>
  <td class="namecol">{{name}}</td>
  <td class="classcol">{{class_desc}}</td>
  <td class="schoolcol">{{school}}</td>
  <td class="componentcol">{{component_desc}}{{#material_cost}}*{{/material_cost}}</td>
  <td class="sourcecol">{{source}}</td>
</tr>
`;

var floatingDescriptionTemplate = `
<h2>{{name}}</h2>
<b>Casting Time:</b> {{casting_time}}<br/>
<b>Range:</b> {{range}}<br/>
<b>Components:</b> {{component_desc}}<br/>
<b>Duration:</b> {{duration}}<br/>
{{{desc}}}
{{#higher_level}}
<p><b>At higher levels:</b></p>
{{{higher_level}}}
{{/higher_level}}
`;

Mustache.parse(searchSpellTemplate);
Mustache.parse(floatingDescriptionTemplate);

function intersects(sp, filter) {
  if (sp === undefined) sp = [];

  for (var v of sp) {
    if (filter.has(v)) return true;
  }

  return false;
}

$(document).ready(function() {
  var $selectedTable = $('#selectedtable'),
      $selectedTableBody = $('#selectedtablebody'),
      $searchTable = $('#searchtable'),
      $searchTableBody = $('#searchtablebody'),
      $moreRows = $('#morerows'),

      selectedSpells = new Set(),
      selectedSpellsBitSet = new BitSet(),

      // These filters are OR filters with eachother, but AND filters otherwise
      filterClasses = new Set(),
      filterDomains = new Set(),
      filterCircles = new Set(),
      filterOaths = new Set(),
      filterPatrons = new Set(),

      filterSources = new Set(['PHB']),
      filterLevels = new Set(),
      filterSchools = new Set(),
      filterSearch = '';

  var filterSpell = function(sp) {
    if (selectedSpells.has(sp.id))
      return false;

    if (filterSearch !== "" && sp.name.toLowerCase().indexOf(filterSearch) === -1)
      return false;

    if (filterSources.size !== 0 && !filterSources.has(sp.source))
      return false;

    if ((filterClasses.size + filterDomains.size + filterCircles.size +
           filterOaths.size + filterPatrons.size) !== 0 &&
       !(intersects(sp.class, filterClasses) ||
         intersects(sp.cleric_domain, filterDomains) ||
         intersects(sp.druid_circle, filterCircles) ||
         intersects(sp.paladin_oath, filterOaths) ||
         intersects(sp.warlock_patron, filterPatrons))) return false;

    if (filterSchools.size !== 0 && !filterSchools.has(sp.school))
      return false;

    if (filterLevels.size !== 0 && !filterLevels.has(sp.level))
      return false;

    return true;
  };

  var refilter = function() {
    var numSelected = 0;

    for (var row of $searchTableBody.children().toArray()) {
      var $row = $(row),
          sp = $row.data('sp');

      if (filterSpell(sp)) {
        if (numSelected < 50)
          $row.show();
        else
          $row.hide();

        numSelected++;
      } else {
        $row.hide();
      }
    }

    if (numSelected > 50) {
      var remaining = numSelected - 50;
      $moreRows.html(`${remaining} more...`);
      $moreRows.show();
    } else {
      $moreRows.hide();
    }

    // Make the selected table's widths match.
    $selectedTableBody.find('td').each(function (i) {
      $(this).width($($("#searchtablebody tr:first td")[i%6]).width());
    })
  };

  // Initial render.
  spells.forEach(function(sp, i) {
    sp.id = i;

    var $row = $(Mustache.render(searchSpellTemplate, sp));
    $row.data('sp', sp);

    if (i >= 50) {
      $row.hide();
    }

    $searchTableBody.append($row);
  });

  $searchTable.stupidtable();
  $('#startsorted').stupidsort();

  // TODO: load from query string

  $searchTable.on('aftertablesort', function() { refilter(); });
  refilter();

  // Hovering description.
  var $floater = $('#floater');
  $(document).on('mousemove', function(e){
    var x = e.pageX + 5,
        y = e.pageY + 5,
        floaterHeight = $floater.height(),
        documentHeight = $(document).height();

    if (y + floaterHeight > $(document).height() && floaterHeight < documentHeight)
      y = e.pageY - 15 - $floater.height();

    $floater.css({
      position: 'absolute',
      left:  x,
      top:   y
    });
  });

  $(document).on('mouseenter', '.spell', function() {
    var sp = $(this).data('sp');

    var $content = $(Mustache.render(floatingDescriptionTemplate, sp));
    $floater.html($content);
    $floater.show();
  });

  $(document).on('mouseleave', '.spell', function() {
    $floater.hide();
  });

  // Selecting spells.
  var $selectInstructions = $('#selectinstructions'),
      $generate = $('#generate');

  var selectSpell = function(sp) {
    var $row = $(Mustache.render(searchSpellTemplate, sp));
    $row.data('sp', sp)
    $selectedTableBody.append($row);

    selectedSpells.add(sp.id);
    selectedSpellsBitSet.set(sp.id, 1);
    $generate.attr('href', 'gen.html?' + selectedSpellsBitSet.toString(16))

    $selectInstructions.hide();
  }

  var sortSelected = function() {
    $selectedTableBody.children().sort(function(row1, row2) {
      var sp1 = $(row1).data('sp'),
          sp2 = $(row2).data('sp')

      if (sp1.level == sp2.level)
        return sp1.name < sp2.name ? -1 : 1;
      else
        return sp1.level < sp2.level ? -1 : 1;
    }).appendTo($selectedTableBody);
  }

  $searchTableBody.find('.spell').bind('click', function() {
    selectSpell($(this).data('sp'));
    sortSelected();
    refilter();
  });

  // Deselecting spells.
  $selectedTableBody.on('click', '.spell', function() {
    var $this = $(this),
        sp = $this.data('sp');

    $(this).remove();
    selectedSpells.delete(sp.id);
    refilter();

    selectedSpellsBitSet.set(sp.id, 0);
    $generate.attr('href', 'gen.html?' + selectedSpellsBitSet.toString(16))

    if (selectedSpells.size === 0)
      $selectInstructions.show();
  });

  var emptySpells = function() {
    $selectedTableBody.empty();
    selectedSpells = new Set();
    refilter();

    $selectInstructions.show();
  }

  $('#emptyspellbook').bind('click', emptySpells);

  // Preset spellbooks.
  var $presetSelect = $('#presetselect'),
      $presetMaxLevelSelect = $('#presetmaxlevel'),
      $presetSourceSelect = $('#presetsource'),
      presets = new Map();

  var loadPreset = function() {
    var preset = $presetSelect.val(),
        maxLevel = parseInt($presetMaxLevelSelect.val()),
        source = $presetSourceSelect.val();

    if (!presets.has(preset)) return;

    emptySpells();

    console.time('preset');

    presets.get(preset).map(id => spells[id]).filter(function(sp) {
      if (source === 'phb' && sp.source !== 'PHB')
        return false;

      return sp.level <= maxLevel;
    }).forEach(selectSpell);

    sortSelected();
    refilter();

    console.timeEnd('preset');
  }

  $presetSelect.bind('change', loadPreset);
  $presetMaxLevelSelect.bind('change', loadPreset);
  $presetSourceSelect.bind('change', loadPreset);

  // Generate presets.
  var addPreset = function(name, desc, ids) {
    presets.set(name, ids);
    $(`<option value="${name}">${desc}</option>`).appendTo($presetSelect);
  }

  addPreset('cleric', 'Cleric Base', [4, 10, 13, 20, 21, 26, 28, 30, 33, 35, 37,
    40, 48, 56, 61, 62, 72, 83, 85, 87, 88, 93, 94, 95, 99, 103, 104, 108, 109,
    110, 115, 116, 118, 120, 130, 134, 140, 150, 153, 154, 159, 162, 167, 170,
    174, 175, 176, 180, 185, 187, 189, 190, 194, 196, 198, 199, 202, 206, 207,
    218, 219, 227, 230, 232, 237, 238, 243, 250, 251, 252, 256, 259, 287, 288,
    289, 296, 304, 305, 306, 307, 309, 314, 316, 317, 318, 320, 322, 323, 325,
    329, 335, 338, 346, 348, 352, 353, 356, 365, 372, 379, 385, 386, 400, 403,
    412, 414]);

  addPreset('clericknowledge', 'Cleric: Knowledge', [4, 10, 13, 20, 21, 26, 28,
    30, 33, 35, 37, 40, 48, 56, 61, 62, 72, 83, 85, 87, 88, 93, 94, 95, 99, 103,
    104, 108, 109, 110, 115, 116, 118, 120, 130, 134, 140, 150, 153, 154, 159,
    162, 167, 170, 174, 175, 176, 180, 185, 187, 189, 190, 194, 196, 198, 199,
    202, 206, 207, 218, 219, 227, 230, 232, 237, 238, 243, 250, 251, 252, 256,
    259, 287, 288, 289, 296, 304, 305, 306, 307, 309, 314, 316, 317, 318, 320,
    322, 323, 325, 329, 335, 338, 346, 348, 352, 353, 356, 365, 372, 379, 385,
    386, 400, 403, 412, 414]);

  addPreset('clericlife', 'Cleric: Life', [4, 10, 13, 20, 21, 26, 28, 30, 33,
    35, 37, 40, 48, 56, 61, 62, 72, 83, 85, 87, 88, 93, 94, 95, 99, 103, 104,
    108, 109, 110, 115, 116, 118, 120, 130, 134, 140, 150, 153, 154, 159, 162,
    167, 170, 174, 175, 176, 180, 185, 187, 189, 190, 194, 196, 198, 199, 202,
    206, 207, 218, 219, 227, 230, 232, 237, 238, 243, 250, 251, 252, 256, 259,
    287, 288, 289, 296, 304, 305, 306, 307, 309, 314, 316, 317, 318, 320, 322,
    323, 325, 329, 335, 338, 346, 348, 352, 353, 356, 365, 372, 379, 385, 386,
    400, 403, 412, 414]);

  addPreset('clericlight', 'Cleric: Light', [4, 10, 13, 20, 21, 26, 28, 30, 33,
    35, 37, 40, 48, 56, 61, 62, 72, 83, 85, 87, 88, 93, 94, 95, 99, 103, 104,
    108, 109, 110, 115, 116, 118, 120, 130, 134, 140, 150, 153, 154, 159, 162,
    167, 170, 174, 175, 176, 180, 185, 187, 189, 190, 194, 196, 198, 199, 202,
    206, 207, 218, 219, 227, 230, 232, 237, 238, 243, 250, 251, 252, 256, 259,
    287, 288, 289, 296, 304, 305, 306, 307, 309, 314, 316, 317, 318, 320, 322,
    323, 325, 329, 335, 338, 346, 348, 352, 353, 356, 365, 372, 379, 385, 386,
    400, 403, 412, 414]);

  addPreset('clericnature', 'Cleric: Nature', [4, 10, 13, 20, 21, 26, 28, 30,
    33, 35, 37, 40, 48, 56, 61, 62, 72, 83, 85, 87, 88, 93, 94, 95, 99, 103,
    104, 108, 109, 110, 115, 116, 118, 120, 130, 134, 140, 150, 153, 154, 159,
    162, 167, 170, 174, 175, 176, 180, 185, 187, 189, 190, 194, 196, 198, 199,
    202, 206, 207, 218, 219, 227, 230, 232, 237, 238, 243, 250, 251, 252, 256,
    259, 287, 288, 289, 296, 304, 305, 306, 307, 309, 314, 316, 317, 318, 320,
    322, 323, 325, 329, 335, 338, 346, 348, 352, 353, 356, 365, 372, 379, 385,
    386, 400, 403, 412, 414]);

  addPreset('clerictempest', 'Cleric: Tempest', [4, 10, 13, 20, 21, 26, 28, 30,
    33, 35, 37, 40, 48, 56, 61, 62, 72, 83, 85, 87, 88, 93, 94, 95, 99, 103,
    104, 108, 109, 110, 115, 116, 118, 120, 130, 134, 140, 150, 153, 154, 159,
    162, 167, 170, 174, 175, 176, 180, 185, 187, 189, 190, 194, 196, 198, 199,
    202, 206, 207, 218, 219, 227, 230, 232, 237, 238, 243, 250, 251, 252, 256,
    259, 287, 288, 289, 296, 304, 305, 306, 307, 309, 314, 316, 317, 318, 320,
    322, 323, 325, 329, 335, 338, 346, 348, 352, 353, 356, 365, 372, 379, 385,
    386, 400, 403, 412, 414]);

  addPreset('clerictrickery', 'Cleric: Trickery', [4, 10, 13, 20, 21, 26, 28,
    30, 33, 35, 37, 40, 48, 56, 61, 62, 72, 83, 85, 87, 88, 93, 94, 95, 99, 103,
    104, 108, 109, 110, 115, 116, 118, 120, 130, 134, 140, 150, 153, 154, 159,
    162, 167, 170, 174, 175, 176, 180, 185, 187, 189, 190, 194, 196, 198, 199,
    202, 206, 207, 218, 219, 227, 230, 232, 237, 238, 243, 250, 251, 252, 256,
    259, 287, 288, 289, 296, 304, 305, 306, 307, 309, 314, 316, 317, 318, 320,
    322, 323, 325, 329, 335, 338, 346, 348, 352, 353, 356, 365, 372, 379, 385,
    386, 400, 403, 412, 414]);

  addPreset('clericwar', 'Cleric: War', [4, 10, 13, 20, 21, 26, 28, 30, 33, 35,
    37, 40, 48, 56, 61, 62, 72, 83, 85, 87, 88, 93, 94, 95, 99, 103, 104, 108,
    109, 110, 115, 116, 118, 120, 130, 134, 140, 150, 153, 154, 159, 162, 167,
    170, 174, 175, 176, 180, 185, 187, 189, 190, 194, 196, 198, 199, 202, 206,
    207, 218, 219, 227, 230, 232, 237, 238, 243, 250, 251, 252, 256, 259, 287,
    288, 289, 296, 304, 305, 306, 307, 309, 314, 316, 317, 318, 320, 322, 323,
    325, 329, 335, 338, 346, 348, 352, 353, 356, 365, 372, 379, 385, 386, 400,
    403, 412, 414]);

  addPreset('druid', 'Druid Base', [1, 7, 8, 9, 12, 14, 25, 29, 31, 32, 38, 43,
    47, 51, 63, 68, 69, 73, 75, 77, 81, 83, 86, 87, 88, 89, 92, 94, 99, 102,
    103, 109, 110, 116, 121, 126, 127, 128, 129, 130, 132, 134, 137, 139, 145,
    149, 150, 153, 154, 159, 160, 161, 163, 166, 169, 170, 172, 175, 177, 181,
    182, 185, 189, 191, 192, 195, 198, 199, 200, 202, 206, 211, 212, 219, 220,
    221, 222, 223, 225, 230, 236, 237, 238, 239, 240, 247, 250, 256, 259, 264,
    269, 270, 275, 281, 288, 290, 292, 298, 301, 304, 306, 307, 314, 315, 317,
    319, 325, 331, 332, 336, 341, 343, 347, 349, 351, 356, 357, 358, 361, 362,
    373, 375, 376, 377, 380, 381, 383, 385, 388, 393, 397, 398, 399, 401, 402,
    403, 404, 407, 408, 409]);

  addPreset('druidarctic', 'Druid: Arctic', [1, 7, 8, 9, 12, 14, 25, 29, 31, 32,
    38, 43, 47, 51, 63, 68, 69, 73, 75, 77, 81, 83, 86, 87, 88, 89, 92, 94, 99,
    102, 103, 109, 110, 116, 121, 126, 127, 128, 129, 130, 132, 134, 137, 139,
    145, 149, 150, 153, 154, 159, 160, 161, 163, 166, 169, 170, 172, 175, 177,
    181, 182, 185, 189, 191, 192, 195, 198, 199, 200, 202, 206, 211, 212, 219,
    220, 221, 222, 223, 225, 230, 236, 237, 238, 239, 240, 247, 250, 256, 259,
    264, 269, 270, 275, 281, 288, 290, 292, 298, 301, 304, 306, 307, 314, 315,
    317, 319, 325, 331, 332, 336, 341, 343, 347, 349, 351, 356, 357, 358, 361,
    362, 373, 375, 376, 377, 380, 381, 383, 385, 388, 393, 397, 398, 399, 401,
    402, 403, 404, 407, 408, 409]);

  addPreset('druidcoast', 'Druid: Coast', [1, 7, 8, 9, 12, 14, 25, 29, 31, 32,
    38, 43, 47, 51, 63, 68, 69, 73, 75, 77, 81, 83, 86, 87, 88, 89, 92, 94, 99,
    102, 103, 109, 110, 116, 121, 126, 127, 128, 129, 130, 132, 134, 137, 139,
    145, 149, 150, 153, 154, 159, 160, 161, 163, 166, 169, 170, 172, 175, 177,
    181, 182, 185, 189, 191, 192, 195, 198, 199, 200, 202, 206, 211, 212, 219,
    220, 221, 222, 223, 225, 230, 236, 237, 238, 239, 240, 247, 250, 256, 259,
    264, 269, 270, 275, 281, 288, 290, 292, 298, 301, 304, 306, 307, 314, 315,
    317, 319, 325, 331, 332, 336, 341, 343, 347, 349, 351, 356, 357, 358, 361,
    362, 373, 375, 376, 377, 380, 381, 383, 385, 388, 393, 397, 398, 399, 401,
    402, 403, 404, 407, 408, 409]);

  addPreset('druiddesert', 'Druid: Desert', [1, 7, 8, 9, 12, 14, 25, 29, 31, 32,
    38, 43, 47, 51, 63, 68, 69, 73, 75, 77, 81, 83, 86, 87, 88, 89, 92, 94, 99,
    102, 103, 109, 110, 116, 121, 126, 127, 128, 129, 130, 132, 134, 137, 139,
    145, 149, 150, 153, 154, 159, 160, 161, 163, 166, 169, 170, 172, 175, 177,
    181, 182, 185, 189, 191, 192, 195, 198, 199, 200, 202, 206, 211, 212, 219,
    220, 221, 222, 223, 225, 230, 236, 237, 238, 239, 240, 247, 250, 256, 259,
    264, 269, 270, 275, 281, 288, 290, 292, 298, 301, 304, 306, 307, 314, 315,
    317, 319, 325, 331, 332, 336, 341, 343, 347, 349, 351, 356, 357, 358, 361,
    362, 373, 375, 376, 377, 380, 381, 383, 385, 388, 393, 397, 398, 399, 401,
    402, 403, 404, 407, 408, 409]);

  addPreset('druidforest', 'Druid: Forest', [1, 7, 8, 9, 12, 14, 25, 29, 31, 32,
    38, 43, 47, 51, 63, 68, 69, 73, 75, 77, 81, 83, 86, 87, 88, 89, 92, 94, 99,
    102, 103, 109, 110, 116, 121, 126, 127, 128, 129, 130, 132, 134, 137, 139,
    145, 149, 150, 153, 154, 159, 160, 161, 163, 166, 169, 170, 172, 175, 177,
    181, 182, 185, 189, 191, 192, 195, 198, 199, 200, 202, 206, 211, 212, 219,
    220, 221, 222, 223, 225, 230, 236, 237, 238, 239, 240, 247, 250, 256, 259,
    264, 269, 270, 275, 281, 288, 290, 292, 298, 301, 304, 306, 307, 314, 315,
    317, 319, 325, 331, 332, 336, 341, 343, 347, 349, 351, 356, 357, 358, 361,
    362, 373, 375, 376, 377, 380, 381, 383, 385, 388, 393, 397, 398, 399, 401,
    402, 403, 404, 407, 408, 409]);

  addPreset('druidgrassland', 'Druid: Grassland', [1, 7, 8, 9, 12, 14, 25, 29,
    31, 32, 38, 43, 47, 51, 63, 68, 69, 73, 75, 77, 81, 83, 86, 87, 88, 89, 92,
    94, 99, 102, 103, 109, 110, 116, 121, 126, 127, 128, 129, 130, 132, 134,
    137, 139, 145, 149, 150, 153, 154, 159, 160, 161, 163, 166, 169, 170, 172,
    175, 177, 181, 182, 185, 189, 191, 192, 195, 198, 199, 200, 202, 206, 211,
    212, 219, 220, 221, 222, 223, 225, 230, 236, 237, 238, 239, 240, 247, 250,
    256, 259, 264, 269, 270, 275, 281, 288, 290, 292, 298, 301, 304, 306, 307,
    314, 315, 317, 319, 325, 331, 332, 336, 341, 343, 347, 349, 351, 356, 357,
    358, 361, 362, 373, 375, 376, 377, 380, 381, 383, 385, 388, 393, 397, 398,
    399, 401, 402, 403, 404, 407, 408, 409]);

  addPreset('druidmountain', 'Druid: Mountain', [1, 7, 8, 9, 12, 14, 25, 29, 31,
    32, 38, 43, 47, 51, 63, 68, 69, 73, 75, 77, 81, 83, 86, 87, 88, 89, 92, 94,
    99, 102, 103, 109, 110, 116, 121, 126, 127, 128, 129, 130, 132, 134, 137,
    139, 145, 149, 150, 153, 154, 159, 160, 161, 163, 166, 169, 170, 172, 175,
    177, 181, 182, 185, 189, 191, 192, 195, 198, 199, 200, 202, 206, 211, 212,
    219, 220, 221, 222, 223, 225, 230, 236, 237, 238, 239, 240, 247, 250, 256,
    259, 264, 269, 270, 275, 281, 288, 290, 292, 298, 301, 304, 306, 307, 314,
    315, 317, 319, 325, 331, 332, 336, 341, 343, 347, 349, 351, 356, 357, 358,
    361, 362, 373, 375, 376, 377, 380, 381, 383, 385, 388, 393, 397, 398, 399,
    401, 402, 403, 404, 407, 408, 409]);

  addPreset('druidswamp', 'Druid: Swamp', [1, 7, 8, 9, 12, 14, 25, 29, 31, 32,
    38, 43, 47, 51, 63, 68, 69, 73, 75, 77, 81, 83, 86, 87, 88, 89, 92, 94, 99,
    102, 103, 109, 110, 116, 121, 126, 127, 128, 129, 130, 132, 134, 137, 139,
    145, 149, 150, 153, 154, 159, 160, 161, 163, 166, 169, 170, 172, 175, 177,
    181, 182, 185, 189, 191, 192, 195, 198, 199, 200, 202, 206, 211, 212, 219,
    220, 221, 222, 223, 225, 230, 236, 237, 238, 239, 240, 247, 250, 256, 259,
    264, 269, 270, 275, 281, 288, 290, 292, 298, 301, 304, 306, 307, 314, 315,
    317, 319, 325, 331, 332, 336, 341, 343, 347, 349, 351, 356, 357, 358, 361,
    362, 373, 375, 376, 377, 380, 381, 383, 385, 388, 393, 397, 398, 399, 401,
    402, 403, 404, 407, 408, 409]);

  addPreset('druidunderdark', 'Druid: Underdark', [1, 7, 8, 9, 12, 14, 25, 29,
    31, 32, 38, 43, 47, 51, 63, 68, 69, 73, 75, 77, 81, 83, 86, 87, 88, 89, 92,
    94, 99, 102, 103, 109, 110, 116, 121, 126, 127, 128, 129, 130, 132, 134,
    137, 139, 145, 149, 150, 153, 154, 159, 160, 161, 163, 166, 169, 170, 172,
    175, 177, 181, 182, 185, 189, 191, 192, 195, 198, 199, 200, 202, 206, 211,
    212, 219, 220, 221, 222, 223, 225, 230, 236, 237, 238, 239, 240, 247, 250,
    256, 259, 264, 269, 270, 275, 281, 288, 290, 292, 298, 301, 304, 306, 307,
    314, 315, 317, 319, 325, 331, 332, 336, 341, 343, 347, 349, 351, 356, 357,
    358, 361, 362, 373, 375, 376, 377, 380, 381, 383, 385, 388, 393, 397, 398,
    399, 401, 402, 403, 404, 407, 408, 409]);

  addPreset('paladin', 'Paladin Base', [4, 22, 23, 24, 27, 28, 37, 39, 45, 55,
    61, 64, 93, 98, 99, 103, 104, 107, 108, 109, 110, 115, 116, 119, 133, 152,
    175, 203, 230, 237, 238, 243, 248, 305, 306, 307, 309, 316, 320, 326, 335,
    354, 374, 413, 414]);

  addPreset('paladinancients', 'Paladin: Ancients', [4, 22, 23, 24, 27, 28, 37,
    39, 45, 55, 61, 64, 93, 98, 99, 103, 104, 107, 108, 109, 110, 115, 116, 119,
    133, 152, 175, 203, 230, 237, 238, 243, 248, 305, 306, 307, 309, 316, 320,
    326, 335, 354, 374, 413, 414]);

  addPreset('paladindevotion', 'Paladin: Devotion', [4, 22, 23, 24, 27, 28, 37,
    39, 45, 55, 61, 64, 93, 98, 99, 103, 104, 107, 108, 109, 110, 115, 116, 119,
    133, 152, 175, 203, 230, 237, 238, 243, 248, 305, 306, 307, 309, 316, 320,
    326, 335, 354, 374, 413, 414]);

  addPreset('paladinvengeance', 'Paladin: Vengeance', [4, 22, 23, 24, 27, 28,
    37, 39, 45, 55, 61, 64, 93, 98, 99, 103, 104, 107, 108, 109, 110, 115, 116,
    119, 133, 152, 175, 203, 230, 237, 238, 243, 248, 305, 306, 307, 309, 316,
    320, 326, 335, 354, 374, 413, 414]);

  // Filter buttons.
  var toggleFilter = function(dom, filter, v) {
    var $this = $(dom);

    if ($this.hasClass('selected')) {
      $this.removeClass('selected');
      filter.delete(v);
    } else {
      $this.addClass('selected');
      filter.add(v);
    }

    refilter();
  }

  $('#filterphb').bind('click',function() { toggleFilter(this, filterSources, 'PHB') });
  $('#filtereepc').bind('click',function() { toggleFilter(this, filterSources, 'EE PC') });
  $('#filterscag').bind('click',function() { toggleFilter(this, filterSources, 'SCAG') });
  $('#filteruatobm').bind('click',function() { toggleFilter(this, filterSources, 'UA TOBM') });
  $('#filtertrotspells').bind('click',function() { toggleFilter(this, filterSources, 'TROT SPELLS') });
  $('#clearsources').bind('click', function() {
    $('a.filtersource').removeClass('selected');
    filterSources = new Set();
    refilter();
  });

  $('#filtersorcerer').bind('click', function() { toggleFilter(this, filterClasses, 'Sorcerer') });
  $('#filterwizard').bind('click', function() { toggleFilter(this, filterClasses, 'Wizard') });
  $('#filterdruid').bind('click', function() { toggleFilter(this, filterClasses, 'Druid') });
  $('#filterranger').bind('click', function() { toggleFilter(this, filterClasses, 'Ranger') });
  $('#filtercleric').bind('click', function() { toggleFilter(this, filterClasses, 'Cleric') });
  $('#filterpaladin').bind('click', function() { toggleFilter(this, filterClasses, 'Paladin') });
  $('#filterritualcaster').bind('click', function() { toggleFilter(this, filterClasses, 'Ritual Caster') });
  $('#filterbard').bind('click', function() { toggleFilter(this, filterClasses, 'Bard') });
  $('#filterwarlock').bind('click', function() { toggleFilter(this, filterClasses, 'Warlock') });

  $('#filternature').bind('click', function() { toggleFilter(this, filterDomains, 'Nature') });
  $('#filterknowledge').bind('click', function() { toggleFilter(this, filterDomains, 'Knowledge') });
  $('#filterlife').bind('click', function() { toggleFilter(this, filterDomains, 'Life') });
  $('#filtertrickery').bind('click', function() { toggleFilter(this, filterDomains, 'Trickery') });
  $('#filterlight').bind('click', function() { toggleFilter(this, filterDomains, 'Light') });
  $('#filtertempest').bind('click', function() { toggleFilter(this, filterDomains, 'Tempest') });
  $('#filterwar').bind('click', function() { toggleFilter(this, filterDomains, 'War') });

  $('#filterforest').bind('click', function() { toggleFilter(this, filterCircles, 'Forest') });
  $('#filterdesert').bind('click', function() { toggleFilter(this, filterCircles, 'Desert') });
  $('#filterunderdark').bind('click', function() { toggleFilter(this, filterCircles, 'Underdark') });
  $('#filterarctic').bind('click', function() { toggleFilter(this, filterCircles, 'Arctic') });
  $('#filtercoast').bind('click', function() { toggleFilter(this, filterCircles, 'Coast') });
  $('#filterswamp').bind('click', function() { toggleFilter(this, filterCircles, 'Swamp') });
  $('#filtergrassland').bind('click', function() { toggleFilter(this, filterCircles, 'Grassland') });
  $('#filtermountain').bind('click', function() { toggleFilter(this, filterCircles, 'Mountain') });

  $('#filtervengeance').bind('click', function() { toggleFilter(this, filterOaths, 'Vengeance') });
  $('#filterdevotion').bind('click', function() { toggleFilter(this, filterOaths, 'Devotion') });
  $('#filterancients').bind('click', function() { toggleFilter(this, filterOaths, 'Ancients') });

  $('#filterfiend').bind('click', function() { toggleFilter(this, filterPatrons, 'Fiend') });
  $('#filterarchfey').bind('click', function() { toggleFilter(this, filterPatrons, 'Archfey') });
  $('#filtergreatoldone').bind('click', function() { toggleFilter(this, filterPatrons, 'Great Old One') });

  $('#clearlists').bind('click', function() {
    $('a.filterclass, a.filterdomain, a.filtercircle, a.filteroath, a.filterpatron').removeClass('selected');
    filterClasses = new Set();
    filterDomains = new Set();
    filterCircles = new Set();
    filterOaths = new Set();
    filterPatrons = new Set();
    refilter();
  });

  $('#filternecromancy').bind('click', function() { toggleFilter(this, filterSchools, 'Necromancy') });
  $('#filterabjuration').bind('click', function() { toggleFilter(this, filterSchools, 'Abjuration') });
  $('#filterconjuration').bind('click', function() { toggleFilter(this, filterSchools, 'Conjuration') });
  $('#filterevocation').bind('click', function() { toggleFilter(this, filterSchools, 'Evocation') });
  $('#filtertransmutation').bind('click', function() { toggleFilter(this, filterSchools, 'Transmutation') });
  $('#filterenchantment').bind('click', function() { toggleFilter(this, filterSchools, 'Enchantment') });
  $('#filterdivination').bind('click', function() { toggleFilter(this, filterSchools, 'Divination') });
  $('#filterillusion').bind('click', function() { toggleFilter(this, filterSchools, 'Illusion') });
  $('#clearschools').bind('click', function() {
    $('a.filterschool').removeClass('selected');
    filterSchools = new Set();
    refilter();
  });

  $('#filterlevel0').bind('click', function() { toggleFilter(this, filterLevels, 0) });
  $('#filterlevel1').bind('click', function() { toggleFilter(this, filterLevels, 1) });
  $('#filterlevel2').bind('click', function() { toggleFilter(this, filterLevels, 2) });
  $('#filterlevel3').bind('click', function() { toggleFilter(this, filterLevels, 3) });
  $('#filterlevel4').bind('click', function() { toggleFilter(this, filterLevels, 4) });
  $('#filterlevel5').bind('click', function() { toggleFilter(this, filterLevels, 5) });
  $('#filterlevel6').bind('click', function() { toggleFilter(this, filterLevels, 6) });
  $('#filterlevel7').bind('click', function() { toggleFilter(this, filterLevels, 7) });
  $('#filterlevel8').bind('click', function() { toggleFilter(this, filterLevels, 8) });
  $('#filterlevel9').bind('click', function() { toggleFilter(this, filterLevels, 9) });
  $('#clearlevels').bind('click', function() {
    $('a.filterlevel').removeClass('selected');
    filterLevels = new Set();
    refilter();
  });

  var $searchBox = $('#searchinput');
  $searchBox.bind('input', function() {
    filterSearch = $(this).val();
    refilter();
  });

  $('#clearsearch').bind('click', function() {
    $searchBox.val('');
    filterSearch = '';
    refilter();
  });

  $('#clearfilters').bind('click', function() {
    $('.filterbutton').removeClass('selected');
    $('#filterphb').addClass('selected');

    filterSources = new Set(['PHB']);
    filterClasses = new Set();
    filterDomains = new Set();
    filterCircles = new Set();
    filterOaths = new Set();
    filterPatrons = new Set();
    filterSchools = new Set();
    filterLevels = new Set();

    $searchBox.val('');
    filterSearch = '';

    refilter();
  });
});
