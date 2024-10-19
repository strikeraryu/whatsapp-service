import yaml
import docker
import os

class ContainerManager:
    def __init__(self, services_config_file = "docker-compose.yaml"):
        self.services = self._parse_config(services_config_file)
        self.client = docker.from_env()

    def _parse_config(self, config_file):
        with open(config_file, 'r') as config:
            return yaml.safe_load(config)['services']


    def run(self, service_name, extra_env=None):
        if service_name not in self.services:
            raise ValueError(f"Service '{service_name}' not found in configuration")

        service_config = self.services[service_name]
        
        # Prepare container configuration
        container_config = {
            'image': service_config['image'],
            'volumes': self._parse_volumes(service_config.get('volumes', [])),
            'environment': self._get_environment(service_config.get('env_file'), extra_env),
            'network_mode': service_config.get('network_mode'),
            'command': service_config.get('command'),
        }

        # Run the container
        container = self.client.containers.run(**container_config, detach=True)
        print(f"Started service '{service_name}' in container {container.id}")
        return container

    def kill(self, container_id):
        self.client.containers.get(container_id).kill()
        print(f"Killed container {container_id}")

    def running(self, container_id):
        try:
            container = self.client.containers.get(container_id)
            return container.status == 'running'
        except docker.errors.NotFound:
            return False

    def _parse_volumes(self, volumes):
        parsed_volumes = {}
        for volume in volumes:
            host_path, container_path = volume.split(':')
            host_path = os.path.abspath(host_path)  # Convert to absolute path
            parsed_volumes[host_path] = {'bind': container_path, 'mode': 'ro'}
        return parsed_volumes

    def _parse_env_file(self, env_file):
        if not env_file:
            return {}
        with open(env_file, 'r') as f:
            return dict(line.strip().split('=') for line in f if line.strip() and not line.startswith('#'))

    def _get_environment(self, env_file, extra_env):
        env = self._parse_env_file(env_file)
        if extra_env:
            env.update(extra_env)
        return env
