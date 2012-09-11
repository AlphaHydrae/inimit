require 'find'
require 'digest/sha1'
require 'paint'

module Inimit
  VERSION = '0.0.1'

  def self.compare *args

    self.abort "A source and target directory are required (got #{args.length} arguments)" unless args.length == 2

    source, target = args.shift, args.shift
    self.abort "Source #{source} is not a directory" unless File.directory? source
    self.abort "Target #{target} is not a directory" unless File.directory? target

    source, target = File.expand_path(source), File.expand_path(target)

    puts
    puts "Comparing files in #{source} to #{target}:"
    puts

    Dir.chdir source
    unknown = []
    different = []

    Find.find '.' do |file|

      # skip directories
      next unless File.file? file

      print "- #{file.sub /^\.\//, ''}..."

      source_file = File.join source, file
      target_file = File.join target, file

      if !File.file? target_file
        unknown << file
        puts Paint[" not found", :yellow]
        next
      end

      source_sha1 = self.hash source_file
      target_sha1 = self.hash target_file

      if source_sha1 == target_sha1
        puts Paint[" #{source_sha1[0,7]} == #{target_sha1[0,7]}", :green]
      else
        puts Paint[" #{source_sha1[0,7]} != #{target_sha1[0,7]}", :red]
        different << { :file => file, :source => source_sha1, :target => target_sha1 }
      end
    end

    if different.empty? and unknown.empty?
      puts
      puts Paint["All files in #{source} are the same in #{target}.", :green, :bold]
      puts
      return
    end

    if unknown.any?
      puts
      puts Paint["The following files in #{source} were not found in #{target}:", :yellow, :bold]
      unknown.each do |file|
        puts "- #{file}"
      end
    end

    if different.any?
      puts
      puts Paint["The following files in #{source} do not have the same content in #{target}:", :red, :bold]
      different.each do |h|
        puts "- #{h[:file]}"
      end
    end

    puts
  end

  def self.hash file
    dig = Digest::SHA1.new
    File.open file, 'rb' do |io|
      dig.update io.readpartial(4096) while !io.eof
    end
    dig.hexdigest
  end

  def self.abort msg
    warn msg
    exit 1
  end
end
